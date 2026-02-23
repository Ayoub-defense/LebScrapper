import logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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

# Frontend React (build statique)
DIST = Path(__file__).parent.parent / "frontend" / "dist"

if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        index = DIST / "index.html"
        return FileResponse(index)
else:
    @app.get("/")
    async def root():
        return {"status": "API OK", "message": "Frontend non buildé"}
