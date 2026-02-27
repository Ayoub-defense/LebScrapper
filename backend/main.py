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
from .models.models import User, SearchFilter, Listing, Alert, SiteSettings
from .routers import auth, filters, dashboard
from .routers.admin import router as admin_router, init_settings, _cache
# from .services.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 DealHunter AI démarrage…")
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client.get_default_database(),
        document_models=[User, SearchFilter, Listing, Alert, SiteSettings],
    )
    logger.info("✅ MongoDB connecté")

    # Charge les settings depuis MongoDB
    from .routers.admin import init_settings as _init
    await _init()

    # start_scheduler()  <-- ICI ON AJOUTE LE #
    yield
    # stop_scheduler()   <-- ICI AUSSI
    client.close()


app = FastAPI(title="DealHunter AI", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Middleware maintenance (lit le cache, pas la DB à chaque req) ──
@app.middleware("http")
async def maintenance_middleware(request: Request, call_next):
    from .routers.admin import _cache as cache
    path = request.url.path

    # Toujours autoriser : auth, admin, assets, et la route status publique
    allowed = (
        path.startswith("/api/auth")
        or path.startswith("/api/admin")
        or path.startswith("/assets")
        or path == "/"
    )

    if cache.get("maintenance_mode") and not allowed and path.startswith("/api/"):
        return JSONResponse(
            status_code=503,
            content={
                "detail": cache.get("maintenance_message", "Service en maintenance"),
                "maintenance": True,
            },
        )
    return await call_next(request)


# ── Routes ────────────────────────────────────────────────────
app.include_router(auth.router,     prefix="/api")
app.include_router(filters.router,  prefix="/api")
app.include_router(dashboard.router,prefix="/api")
app.include_router(admin_router,    prefix="/api")

# ── Frontend SPA ──────────────────────────────────────────────
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
            },
        )
else:
    @app.get("/")
    async def root():
        return {"status": "API OK — frontend non buildé"}
