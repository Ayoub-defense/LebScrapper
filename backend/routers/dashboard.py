from fastapi import APIRouter, Depends, Query
from ..models.models import SearchFilter, Listing, Alert
from ..routers.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/stats")
async def get_stats(user=Depends(get_current_user)):
    user_id = str(user.id)
    active_filters = await SearchFilter.find(
        SearchFilter.user_id == user_id,
        SearchFilter.is_active == True
    ).count()
    total_analyzed = await Listing.find(Listing.user_id == user_id).count()
    good_deals = await Listing.find(
        Listing.user_id == user_id,
        Listing.ai_score >= 8.0
    ).count()
    alerts_sent = await Alert.find(Alert.user_id == user_id).count()
    return {
        "active_filters": active_filters,
        "total_analyzed": total_analyzed,
        "good_deals_found": good_deals,
        "alerts_sent": alerts_sent,
    }

@router.get("/listings")
async def get_listings(
    user=Depends(get_current_user),
    min_score: float = Query(0, ge=0, le=10),
    per_page: int = Query(20, ge=1, le=100),
    page: int = Query(1, ge=1),
):
    user_id = str(user.id)
    query = Listing.find(Listing.user_id == user_id)
    if min_score > 0:
        query = Listing.find(Listing.user_id == user_id, Listing.ai_score >= min_score)
    skip = (page - 1) * per_page
    listings = await query.sort(-Listing.found_at).skip(skip).limit(per_page).to_list()
    return {
        "listings": [
            {
                "id":           str(l.id),
                "listing_id":   l.listing_id,        # ← nécessaire pour fallback platform
                "platform":     l.platform,           # ← fix étiquette Vinted/Leboncoin
                "filter_id":    l.filter_id,          # ← nécessaire pour filtre par filtre
                "title":        l.title,
                "price":        l.price,
                "location":     l.location,
                "url":          l.url,
                "image_url":    l.image_url,
                "seller_type":  l.seller_type,
                "ai_score":     l.ai_score,
                "ai_analysis":  l.ai_analysis,
                "ai_highlights": l.ai_highlights,
                "alert_sent":   l.alert_sent,
                "found_at":     l.found_at.isoformat(),
            }
            for l in listings
        ],
        "page": page,
        "per_page": per_page,
    }

@router.get("/alerts")
async def get_alerts(user=Depends(get_current_user)):
    alerts = await Alert.find(Alert.user_id == str(user.id)).sort(-Alert.sent_at).limit(50).to_list()
    return [
        {
            "id":            str(a.id),
            "listing_title": a.listing_title,
            "listing_price": a.listing_price,
            "listing_url":   a.listing_url,
            "ai_score":      a.ai_score,
            "sent_at":       a.sent_at.isoformat(),
            "email_status":  a.email_status,
        }
        for a in alerts
    ]
