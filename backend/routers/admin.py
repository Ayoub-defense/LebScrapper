"""
Routes admin — accessibles uniquement aux utilisateurs avec is_admin=True
"""
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from ..models.models import User, SearchFilter, Listing, Alert
from ..routers.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])

# ── Shared state (en mémoire — reset au redémarrage) ─────────
_settings = {
    "maintenance_mode": False,
    "maintenance_message": "Le service est temporairement en maintenance. Merci de revenir plus tard.",
    "scraper_enabled": True,
    "scan_interval_minutes": 60,
    "max_listings_per_scan": 20,
    "min_score_global": 1.0,
    "banner_enabled": False,
    "banner_message": "",
    "banner_type": "info",  # info | warning | error
}


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if not getattr(user, 'is_admin', False):
        raise HTTPException(status_code=403, detail="Accès administrateur requis")
    return user


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

    # Top 5 users par nb de filtres
    all_filters = await SearchFilter.find_all().to_list()
    user_filter_counts = {}
    for f in all_filters:
        user_filter_counts[f.user_id] = user_filter_counts.get(f.user_id, 0) + 1

    top_user_ids = sorted(user_filter_counts, key=lambda k: user_filter_counts[k], reverse=True)[:5]
    top_users = []
    for uid in top_user_ids:
        u = await User.get(uid)
        if u:
            top_users.append({
                "id": str(u.id),
                "email": u.email,
                "full_name": u.full_name,
                "filters": user_filter_counts[uid],
            })

    # Dernières alertes
    last_alerts = await Alert.find_all().sort(-Alert.sent_at).limit(5).to_list()

    return {
        "stats": {
            "total_users":    total_users,
            "total_filters":  total_filters,
            "active_filters": active_filters,
            "total_listings": total_listings,
            "total_alerts":   total_alerts,
            "sent_alerts":    sent_alerts,
            "failed_alerts":  failed_alerts,
        },
        "top_users":   top_users,
        "last_alerts": [
            {
                "id": str(a.id),
                "user_id": a.user_id,
                "listing_title": a.listing_title,
                "ai_score": a.ai_score,
                "sent_at": a.sent_at.isoformat(),
                "email_status": a.email_status,
            }
            for a in last_alerts
        ],
        "settings": _settings,
    }


# ── USERS ────────────────────────────────────────────────────
@router.get("/users")
async def list_users(admin=Depends(require_admin)):
    users = await User.find_all().to_list()
    result = []
    for u in users:
        filter_count  = await SearchFilter.find(SearchFilter.user_id == str(u.id)).count()
        listing_count = await Listing.find(Listing.user_id == str(u.id)).count()
        alert_count   = await Alert.find(Alert.user_id == str(u.id)).count()
        result.append({
            "id":           str(u.id),
            "email":        u.email,
            "full_name":    u.full_name or "",
            "is_active":    u.is_active,
            "is_admin":     getattr(u, 'is_admin', False),
            "created_at":   u.created_at.isoformat(),
            "filter_count": filter_count,
            "listing_count": listing_count,
            "alert_count":  alert_count,
        })
    return result


@router.patch("/users/{user_id}/toggle-active")
async def toggle_user_active(user_id: str, admin=Depends(require_admin)):
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    if str(user.id) == str(admin.id):
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous désactiver vous-même")
    user.is_active = not user.is_active
    await user.save()
    return {"is_active": user.is_active}


@router.patch("/users/{user_id}/toggle-admin")
async def toggle_user_admin(user_id: str, admin=Depends(require_admin)):
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    if str(user.id) == str(admin.id):
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas modifier votre propre rôle admin")
    user.is_admin = not getattr(user, 'is_admin', False)
    await user.save()
    return {"is_admin": user.is_admin}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin=Depends(require_admin)):
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    if str(user.id) == str(admin.id):
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer votre propre compte")
    await SearchFilter.find(SearchFilter.user_id == user_id).delete()
    await Listing.find(Listing.user_id == user_id).delete()
    await Alert.find(Alert.user_id == user_id).delete()
    await user.delete()
    return {"message": "Utilisateur et toutes ses données supprimés"}


# ── SETTINGS ─────────────────────────────────────────────────
@router.get("/settings")
async def get_settings(admin=Depends(require_admin)):
    return _settings


class SettingsBody(BaseModel):
    maintenance_mode:     Optional[bool]   = None
    maintenance_message:  Optional[str]    = None
    scraper_enabled:      Optional[bool]   = None
    scan_interval_minutes: Optional[int]   = None
    max_listings_per_scan: Optional[int]   = None
    min_score_global:     Optional[float]  = None
    banner_enabled:       Optional[bool]   = None
    banner_message:       Optional[str]    = None
    banner_type:          Optional[str]    = None


@router.patch("/settings")
async def update_settings(body: SettingsBody, admin=Depends(require_admin)):
    for key, value in body.dict(exclude_none=True).items():
        if key in _settings:
            _settings[key] = value
    logger.info(f"⚙️ Admin settings mis à jour par {admin.email}: {body.dict(exclude_none=True)}")
    return _settings


# ── MAINTENANCE ───────────────────────────────────────────────
@router.post("/maintenance/toggle")
async def toggle_maintenance(admin=Depends(require_admin)):
    _settings["maintenance_mode"] = not _settings["maintenance_mode"]
    status = "activée" if _settings["maintenance_mode"] else "désactivée"
    logger.info(f"🔧 Maintenance {status} par {admin.email}")
    return {"maintenance_mode": _settings["maintenance_mode"]}


# ── DATA CLEANUP ──────────────────────────────────────────────
@router.delete("/data/listings/old")
async def purge_old_listings(days: int = 30, admin=Depends(require_admin)):
    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(days=days)
    result = await Listing.find(Listing.found_at < cutoff).delete()
    count = result.deleted_count if result else 0
    logger.info(f"🗑️ Purge {count} annonces > {days}j par {admin.email}")
    return {"deleted": count, "message": f"{count} annonces supprimées (> {days} jours)"}


@router.delete("/data/alerts/old")
async def purge_old_alerts(days: int = 30, admin=Depends(require_admin)):
    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(days=days)
    result = await Alert.find(Alert.sent_at < cutoff).delete()
    count = result.deleted_count if result else 0
    logger.info(f"🗑️ Purge {count} alertes > {days}j par {admin.email}")
    return {"deleted": count, "message": f"{count} alertes supprimées (> {days} jours)"}


# ── STATUS CHECK (public — utilisé par le frontend) ───────────
@router.get("/status")
async def public_status():
    """Endpoint public pour vérifier maintenance_mode côté client"""
    return {
        "maintenance_mode":    _settings["maintenance_mode"],
        "maintenance_message": _settings["maintenance_message"],
        "banner_enabled":      _settings["banner_enabled"],
        "banner_message":      _settings["banner_message"],
        "banner_type":         _settings["banner_type"],
    }
