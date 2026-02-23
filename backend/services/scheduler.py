import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from ..core.config import settings

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


async def run_all_scans():
    """Scan automatique de tous les filtres actifs — lancé depuis ton PC uniquement."""
    logger.info("⏰ Scan automatique ignoré sur Render — utilise scanner.py sur ton PC")


def start_scheduler():
    scheduler.add_job(
        run_all_scans,
        "interval",
        minutes=settings.SCAN_INTERVAL_MINUTES,
        id="run_all_scans",
    )
    scheduler.start()
    logger.info(f"🚀 Scheduler démarré (toutes les {settings.SCAN_INTERVAL_MINUTES} min)")


def stop_scheduler():
    scheduler.shutdown()
