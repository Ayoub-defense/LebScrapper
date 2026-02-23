from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from ..models.models import SearchFilter, Listing
from ..routers.auth import get_current_user
from ..services.scraper import scan_filter

router = APIRouter(prefix="/filters", tags=["filters"])


class FilterBody(BaseModel):
    name: str
    keywords: str
    category: Optional[str] = None
    city: Optional[str] = None
    max_price: Optional[float] = None
    min_price: float = 0
    radius_km: int = 30
    min_score: float = 8.0


@router.get("/")
async def list_filters(user=Depends(get_current_user)):
    filters = await SearchFilter.find(SearchFilter.user_id == str(user.id)).to_list()
    return [
        {
            "id": str(f.id),
            "name": f.name,
            "keywords": f.keywords,
            "category": f.category,
            "city": f.city,
            "max_price": f.max_price,
            "min_price": f.min_price,
            "min_score": f.min_score,
            "is_active": f.is_active,
            "last_scan_at": f.last_scan_at.isoformat() if f.last_scan_at else None,
        }
        for f in filters
    ]


@router.post("/")
async def create_filter(body: FilterBody, user=Depends(get_current_user)):
    count = await SearchFilter.find(SearchFilter.user_id == str(user.id)).count()
    if count >= 10:
        raise HTTPException(status_code=400, detail="Maximum 10 filtres par compte")

    f = SearchFilter(user_id=str(user.id), **body.dict())
    await f.insert()
    return {"id": str(f.id), "message": "Filtre créé"}


@router.delete("/{filter_id}")
async def delete_filter(filter_id: str, user=Depends(get_current_user)):
    f = await SearchFilter.get(filter_id)
    if not f or f.user_id != str(user.id):
        raise HTTPException(status_code=404, detail="Filtre introuvable")
    await Listing.find(Listing.filter_id == filter_id).delete()
    await f.delete()
    return {"message": "Filtre supprimé"}


@router.patch("/{filter_id}/toggle")
async def toggle_filter(filter_id: str, user=Depends(get_current_user)):
    f = await SearchFilter.get(filter_id)
    if not f or f.user_id != str(user.id):
        raise HTTPException(status_code=404, detail="Filtre introuvable")
    f.is_active = not f.is_active
    await f.save()
    return {"is_active": f.is_active}


@router.post("/{filter_id}/scan")
async def manual_scan(filter_id: str, user=Depends(get_current_user)):
    f = await SearchFilter.get(filter_id)
    if not f or f.user_id != str(user.id):
        raise HTTPException(status_code=404, detail="Filtre introuvable")
    new_count = await scan_filter(f)
    return {"message": f"Scan terminé — {new_count} nouvelles annonces analysées"}
