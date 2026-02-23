from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_URL: str = "http://localhost:8000"
    SECRET_KEY: str = "changez_moi"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 jours

    MONGODB_URL: str = "mongodb://localhost:27017/dealhunter"

    GROQ_API_KEY: str = ""

    # Gmail SMTP
    GMAIL_ADDRESS: str = "lebscrapper@gmail.com"
    GMAIL_APP_PASSWORD: str = ""

    MAX_LISTINGS_PER_SCAN: int = 20
    SCAN_INTERVAL_MINUTES: int = 60

    class Config:
        env_file = ".env"


settings = Settings()
