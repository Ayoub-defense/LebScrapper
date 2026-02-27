"""
Routes admin — accessibles uniquement aux utilisateurs is_admin=True.
Les paramètres sont persistés en MongoDB via SiteSettings.
"""
import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from ..models.models import User, SearchFilter, Listing, Alert, SiteSettings
from ..routers.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])

# Cache en mémoire, initialisé depuis MongoDB au démarrage (voir init_settings)
_cache: dict = {}


# ── Init au démarrage ─────────────────────────────────────────
async def init_settings():
    """Appelé au lifespan : charge depuis MongoDB ou crée le document par défaut."""
    global _cache
    s = await SiteSettings.find_one(SiteSettings.key == "global")
    if not s:
        s = SiteSettings()
        await s.insert()
        logger.info("⚙️ SiteSettings créé en base (valeurs par défaut)")
    _cache = s.model_dump()
    logger.info(f"⚙️ SiteSettings chargé : maintenance={s.maintenance_mode}, scraper={s.scraper_enabled}")


async def _get_settings_doc() -> SiteSettings:
    s = await SiteSettings.find_one(SiteSettings.key == "global")
    if not s:
        s = SiteSettings()
        await s.insert()
    return s


# ── Garde admin ───────────────────────────────────────────────
async def require_admin(user: User = Depends(get_current_user)) -> User:
    if not getattr(user, "is_admin", False):
        raise HTTPException(status_code=403, detail="Accès administrateur requis")
    return user


# ── STATUS PUBLIC (pas de token requis) ───────────────────────
@router.get("/status")
async def public_status():
    """Endpoint non protégé — consulté par le frontend au chargement."""
    # Relit depuis le cache (à jour après chaque PATCH /settings)
    return {
        "maintenance_mode":    _cache.get("maintenance_mode", False),
        "maintenance_message": _cache.get("maintenance_message", ""),
        "banner_enabled":      _cache.get("banner_enabled", False),
        "banner_message":      _cache.get("banner_message", ""),
        "banner_type":         _cache.get("banner_type", "info"),
    }


# ── DASHBOARD GLOBAL ─────────────────────────────────────────
@router.get("/dashboard")
async def admin_dashboard(admin=Depends(require_admin)):
    total_users    = await User.count()
    total_filters  = await SearchFilter.count()
    active_filters = await SearchFilter.find(SearchFilter.is_active == True).count()
    total_listings = await Listing.count()
    total_alerts   = await Alert.count()
    sent_alerts    = await Alert.find(Alert.email_status == "sent").count()
    failed_alerts  = await Alert.find(Alert.email_status == "failed").count()

    # Top users par nb de filtres
    all_filters = await SearchFilter.find_all().to_list()
    user_filter_counts: dict = {}
    for f in all_filters:
        user_filter_counts[f.user_id] = user_filter_counts.get(f.user_id, 0) + 1

    top_user_ids = sorted(user_filter_counts, key=lambda k: user_filter_counts[k], reverse=True)[:5]
    top_users = []
    for uid in top_user_ids:
        u = await User.get(uid)
        if u:
            top_users.append({
                "id": str(u.id), "email": u.email,
                "full_name": u.full_name or "",
                "filters": user_filter_counts[uid],
                "is_active": u.is_active,
                "is_admin": getattr(u, "is_admin", False),
            })

    last_alerts = await Alert.find_all().sort(-Alert.sent_at).limit(5).to_list()

    return {
        "stats": {
            "total_users": total_users, "total_filters": total_filters,
            "active_filters": active_filters, "total_listings": total_listings,
            "total_alerts": total_alerts, "sent_alerts": sent_alerts,
            "failed_alerts": failed_alerts,
        },
        "top_users": top_users,
        "last_alerts": [
            {
                "id": str(a.id), "listing_title": a.listing_title,
                "ai_score": a.ai_score, "sent_at": a.sent_at.isoformat(),
                "email_status": a.email_status,
            }
            for a in last_alerts
        ],
        "settings": _cache,
    }


# ── USERS ────────────────────────────────────────────────────
@router.get("/users")
async def list_users(admin=Depends(require_admin)):
    users = await User.find_all().to_list()
    result = []
    for u in users:
        fc = await SearchFilter.find(SearchFilter.user_id == str(u.id)).count()
        lc = await Listing.find(Listing.user_id == str(u.id)).count()
        ac = await Alert.find(Alert.user_id == str(u.id)).count()
        result.append({
            "id": str(u.id), "email": u.email,
            "full_name": u.full_name or "", "is_active": u.is_active,
            "is_admin": getattr(u, "is_admin", False),
            "created_at": u.created_at.isoformat(),
            "filter_count": fc, "listing_count": lc, "alert_count": ac,
        })
    return result


@router.patch("/users/{user_id}/toggle-active")
async def toggle_user_active(user_id: str, admin=Depends(require_admin)):
    u = await User.get(user_id)
    if not u:
        raise HTTPException(404, "Utilisateur introuvable")
    if str(u.id) == str(admin.id):
        raise HTTPException(400, "Vous ne pouvez pas vous désactiver vous-même")
    u.is_active = not u.is_active
    await u.save()
    return {"is_active": u.is_active}


@router.patch("/users/{user_id}/toggle-admin")
async def toggle_user_admin(user_id: str, admin=Depends(require_admin)):
    u = await User.get(user_id)
    if not u:
        raise HTTPException(404, "Utilisateur introuvable")
    if str(u.id) == str(admin.id):
        raise HTTPException(400, "Vous ne pouvez pas modifier votre propre rôle")
    u.is_admin = not getattr(u, "is_admin", False)
    await u.save()
    return {"is_admin": u.is_admin}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin=Depends(require_admin)):
    u = await User.get(user_id)
    if not u:
        raise HTTPException(404, "Utilisateur introuvable")
    if str(u.id) == str(admin.id):
        raise HTTPException(400, "Vous ne pouvez pas supprimer votre propre compte")
    # Supprimer toutes les données liées
    filters_list = await SearchFilter.find(SearchFilter.user_id == user_id).to_list()
    for f in filters_list:
        listings_list = await Listing.find(Listing.filter_id == str(f.id)).to_list()
        for l in listings_list: await l.delete()
        await f.delete()
    alerts_list = await Alert.find(Alert.user_id == user_id).to_list()
    for a in alerts_list: await a.delete()
    await u.delete()
    return {"message": "Utilisateur et toutes ses données supprimés"}


# ── SETTINGS ─────────────────────────────────────────────────
@router.get("/settings")
async def get_settings(admin=Depends(require_admin)):
    return _cache


class SettingsBody(BaseModel):
    maintenance_mode:      Optional[bool]  = None
    maintenance_message:   Optional[str]   = None
    scraper_enabled:       Optional[bool]  = None
    scan_interval_minutes: Optional[int]   = None
    max_listings_per_scan: Optional[int]   = None
    min_score_global:      Optional[float] = None
    banner_enabled:        Optional[bool]  = None
    banner_message:        Optional[str]   = None
    banner_type:           Optional[str]   = None


@router.patch("/settings")
async def update_settings(body: SettingsBody, admin=Depends(require_admin)):
    global _cache
    s = await _get_settings_doc()
    updates = body.model_dump(exclude_none=True)
    for k, v in updates.items():
        if hasattr(s, k):
            setattr(s, k, v)
    await s.save()
    _cache = s.model_dump()
    logger.info(f"⚙️ Settings mis à jour par {admin.email}: {updates}")
    return _cache


@router.post("/maintenance/toggle")
async def toggle_maintenance(admin=Depends(require_admin)):
    global _cache
    s = await _get_settings_doc()
    s.maintenance_mode = not s.maintenance_mode
    await s.save()
    _cache = s.model_dump()
    status = "activée" if s.maintenance_mode else "désactivée"
    logger.info(f"🔧 Maintenance {status} par {admin.email}")
    return {"maintenance_mode": s.maintenance_mode}


# ── PURGE DONNÉES — corrigé ───────────────────────────────────
@router.delete("/data/listings/old")
async def purge_old_listings(days: int = 30, admin=Depends(require_admin)):
    cutoff = datetime.utcnow() - timedelta(days=days)
    docs = await Listing.find(Listing.found_at < cutoff).to_list()
    count = len(docs)
    for doc in docs:
        await doc.delete()
    logger.info(f"🗑️ {count} annonces supprimées (>{days}j) par {admin.email}")
    return {"deleted": count, "message": f"{count} annonce(s) supprimée(s) (plus de {days} jours)"}


@router.delete("/data/alerts/old")
async def purge_old_alerts(days: int = 30, admin=Depends(require_admin)):
    cutoff = datetime.utcnow() - timedelta(days=days)
    docs = await Alert.find(Alert.sent_at < cutoff).to_list()
    count = len(docs)
    for doc in docs:
        await doc.delete()
    logger.info(f"🗑️ {count} alertes supprimées (>{days}j) par {admin.email}")
    return {"deleted": count, "message": f"{count} alerte(s) supprimée(s) (plus de {days} jours)"}


@router.delete("/data/all-listings")
async def purge_all_listings(admin=Depends(require_admin)):
    """Vide TOUTE la collection annonces."""
    docs = await Listing.find_all().to_list()
    count = len(docs)
    for doc in docs:
        await doc.delete()
    return {"deleted": count, "message": f"{count} annonce(s) supprimée(s) (tout)"}
