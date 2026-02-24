import logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from .core.config import settings
from .models.models import User, SearchFilter, Listing, Alert
from .routers import auth, filters, dashboard
from .routers import admin
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


# ── Middleware maintenance ────────────────────────────────────
@app.middleware("http")
async def maintenance_middleware(request: Request, call_next):
    from .routers.admin import _settings
    path = request.url.path

    # Toujours autoriser : auth + admin + status
    allowed = path.startswith("/api/auth") or path.startswith("/api/admin") or path.startswith("/assets")
    if _settings["maintenance_mode"] and not allowed and path.startswith("/api/"):
        return JSONResponse(
            status_code=503,
            content={"detail": _settings["maintenance_message"], "maintenance": True},
        )
    return await call_next(request)


# ── Routes API ────────────────────────────────────────────────
app.include_router(auth.router,      prefix="/api")
app.include_router(filters.router,   prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(admin.router,     prefix="/api")

# ── Frontend ──────────────────────────────────────────────────
DIST = Path(__file__).parent.parent / "frontend" / "dist"

if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        return FileResponse(
            DIST / "index.html",
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
