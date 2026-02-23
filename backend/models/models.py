from datetime import datetime
from typing import Optional, List
from beanie import Document
from pydantic import EmailStr, Field
from pymongo import IndexModel, ASCENDING


class User(Document):
    email: EmailStr
    hashed_password: str
    full_name: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"
        indexes = [
            IndexModel([("email", ASCENDING)], unique=True),
        ]


class SearchFilter(Document):
    user_id: str
    name: str
    keywords: str
    category: Optional[str] = None
    city: Optional[str] = None
    max_price: Optional[float] = None
    min_price: float = 0
    radius_km: int = 30
    min_score: float = 8.0
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_scan_at: Optional[datetime] = None

    class Settings:
        name = "search_filters"


class Listing(Document):
    filter_id: str
    user_id: str
    listing_id: str
    title: str
    price: Optional[float] = None
    location: Optional[str] = None
    description: Optional[str] = None
    url: str
    image_url: Optional[str] = None
    seller_type: Optional[str] = None
    ai_score: Optional[float] = None
    ai_analysis: Optional[str] = None
    ai_highlights: List[str] = []
    alert_sent: bool = False
    found_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "listings"


class Alert(Document):
    user_id: str
    listing_id: str
    listing_title: str
    listing_price: Optional[float] = None
    listing_url: str
    ai_score: float
    sent_at: datetime = Field(default_factory=datetime.utcnow)
    email_status: str = "sent"

    class Settings:
        name = "alerts"
