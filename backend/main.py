import logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from .core.config import settings
from .models.models import User, SearchFilter, Listing, Alert
from .routers import auth, filters, dashboard
from .services.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 DealHunter AI démarrage...")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client.get_default_database(),
        document_models=[User, SearchFilter, Listing, Alert],
    )
    logger.info("✅ MongoDB connecté")
    start_scheduler()
    yield
    stop_scheduler()
    client.close()


app = FastAPI(title="DealHunter AI", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes API
app.include_router(auth.router, prefix="/api")
app.include_router(filters.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")

# Frontend React
DIST = Path(__file__).parent.parent / "frontend" / "dist"

if DIST.exists():
    # Assets JS/CSS avec hash → cache long terme OK
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        index = DIST / "index.html"
        # index.html ne doit JAMAIS être mis en cache
        return FileResponse(
            index,
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            }
        )
else:
    @app.get("/")
    async def root():
        return {"status": "API OK", "message": "Frontend non buildé"}