from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, Literal
from ..models.models import SearchFilter, Listing
from ..routers.auth import get_current_user

router = APIRouter(prefix="/filters", tags=["filters"])
PLATFORMS = Literal["leboncoin", "vinted", "both"]

class FilterBody(BaseModel):
    name: str
    keywords: str
    platform: PLATFORMS = "leboncoin"
    category: Optional[str] = None
    city: Optional[str] = None
    max_price: Optional[float] = None
    min_price: float = 0
    radius_km: int = 30
    min_score: float = Field(default=8.0, ge=1.0, le=10.0)

    # Voiture
    car_km_max: Optional[int] = None
    car_km_min: Optional[int] = None
    car_year_min: Optional[int] = None
    car_year_max: Optional[int] = None
    car_brand: Optional[str] = None
    car_fuel: Optional[str] = None
    car_gearbox: Optional[str] = None
    car_doors: Optional[int] = None

    # Téléphone
    phone_brand: Optional[str] = None
    phone_storage: Optional[str] = None
    phone_condition: Optional[str] = None

    # Informatique
    pc_type: Optional[str] = None
    pc_brand: Optional[str] = None
    pc_ram: Optional[str] = None
    pc_storage: Optional[str] = None

    # Jeux vidéo
    game_platform: Optional[str] = None
    game_type: Optional[str] = None

def _serialize(f: SearchFilter) -> dict:
    return {
        "id":           str(f.id),
        "name":         f.name,
        "keywords":     f.keywords,
        "platform":     f.platform,
        "category":     f.category,
        "city":         f.city,
        "max_price":    f.max_price,
        "min_price":    f.min_price,
        "min_score":    f.min_score,
        "is_active":    f.is_active,
        "last_scan_at": f.last_scan_at.strftime('%Y-%m-%dT%H:%M:%SZ') if f.last_scan_at else None,
        # Voiture
        "car_km_max":   f.car_km_max,
        "car_km_min":   f.car_km_min,
        "car_year_min": f.car_year_min,
        "car_year_max": f.car_year_max,
        "car_brand":    f.car_brand,
        "car_fuel":     f.car_fuel,
        "car_gearbox":  f.car_gearbox,
        "car_doors":    f.car_doors,
        # Téléphone
        "phone_brand":     f.phone_brand,
        "phone_storage":   f.phone_storage,
        "phone_condition": f.phone_condition,
        # Informatique
        "pc_type":    f.pc_type,
        "pc_brand":   f.pc_brand,
        "pc_ram":     f.pc_ram,
        "pc_storage": f.pc_storage,
        # Jeux vidéo
        "game_platform": f.game_platform,
        "game_type":     f.game_type,
    }

@router.get("/")
async def list_filters(user=Depends(get_current_user)):
    filters = await SearchFilter.find(SearchFilter.user_id == str(user.id)).to_list()
    return [_serialize(f) for f in filters]

@router.post("/")
async def create_filter(body: FilterBody, user=Depends(get_current_user)):
    count = await SearchFilter.find(SearchFilter.user_id == str(user.id)).count()
    if count >= 10:
        raise HTTPException(400, "Maximum 10 filtres par compte")
    f = SearchFilter(user_id=str(user.id), **body.model_dump())
    await f.insert()
    return _serialize(f)

@router.delete("/{filter_id}")
async def delete_filter(filter_id: str, user=Depends(get_current_user)):
    f = await SearchFilter.get(filter_id)
    if not f or f.user_id != str(user.id):
        raise HTTPException(404, "Filtre introuvable")
    listings = await Listing.find(Listing.filter_id == filter_id).to_list()
    for l in listings:
        await l.delete()
    await f.delete()
    return {"message": "Filtre supprimé"}

@router.patch("/{filter_id}/toggle")
async def toggle_filter(filter_id: str, user=Depends(get_current_user)):
    f = await SearchFilter.get(filter_id)
    if not f or f.user_id != str(user.id):
        raise HTTPException(404, "Filtre introuvable")
    f.is_active = not f.is_active
    await f.save()
    return {"is_active": f.is_active}

@router.post("/{filter_id}/scan")
async def manual_scan(filter_id: str, user=Depends(get_current_user)):
    from ..services.scraper import scan_filter
    f = await SearchFilter.get(filter_id)
    if not f or f.user_id != str(user.id):
        raise HTTPException(404, "Filtre introuvable")
    new_count = await scan_filter(f)
    return {"message": f"Scan terminé — {new_count} nouvelle(s) annonce(s) analysée(s)"}
