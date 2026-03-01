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
    is_admin: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    class Settings:
        name = "users"
        indexes = [IndexModel([("email", ASCENDING)], unique=True)]

class SearchFilter(Document):
    user_id: str
    name: str
    keywords: str
    platform: str = "leboncoin"   # leboncoin | vinted | both
    category: Optional[str] = None  # voiture | telephone | informatique | jeux_video | electromenager | autre
    city: Optional[str] = None
    max_price: Optional[float] = None
    min_price: float = 0
    radius_km: int = 30
    min_score: float = Field(default=8.0, ge=1.0, le=10.0)
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_scan_at: Optional[datetime] = None

    # ── Filtres avancés voiture ──
    car_km_max: Optional[int] = None          # kilométrage max
    car_km_min: Optional[int] = None          # kilométrage min
    car_year_min: Optional[int] = None        # année min
    car_year_max: Optional[int] = None        # année max
    car_brand: Optional[str] = None           # marque (Renault, Peugeot…)
    car_fuel: Optional[str] = None            # essence | diesel | electrique | hybride
    car_gearbox: Optional[str] = None         # manuelle | automatique
    car_doors: Optional[int] = None           # nb portes

    # ── Filtres avancés téléphone ──
    phone_brand: Optional[str] = None         # Apple | Samsung | Xiaomi…
    phone_storage: Optional[str] = None       # 64Go | 128Go | 256Go | 512Go
    phone_condition: Optional[str] = None     # neuf | tres_bon | bon | satisfaisant

    # ── Filtres avancés informatique ──
    pc_type: Optional[str] = None             # portable | fixe | composant
    pc_brand: Optional[str] = None            # Apple | Dell | HP | Lenovo…
    pc_ram: Optional[str] = None              # 8Go | 16Go | 32Go
    pc_storage: Optional[str] = None          # 256Go | 512Go | 1To | 2To

    # ── Filtres avancés jeux vidéo ──
    game_platform: Optional[str] = None       # PS5 | PS4 | Xbox | Switch | PC
    game_type: Optional[str] = None           # console | jeu | accessoire

    class Settings:
        name = "search_filters"

class Listing(Document):
    filter_id: str
    user_id: str
    listing_id: str
    platform: str = "leboncoin"
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

class SiteSettings(Document):
    key: str = "global"
    maintenance_mode: bool = False
    maintenance_message: str = "Le service est temporairement en maintenance. Merci de revenir plus tard."
    banner_enabled: bool = False
    banner_message: str = ""
    banner_type: str = "info"
    scraper_enabled: bool = True
    scan_interval_minutes: int = 10
    max_listings_per_scan: int = 20
    min_score_global: float = 1.0
    class Settings:
        name = "site_settings"
        indexes = [IndexModel([("key", ASCENDING)], unique=True)]
