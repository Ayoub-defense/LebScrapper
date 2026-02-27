"""
scheduler.py — DealHunter AI
Lance run_all_scans() automatiquement via APScheduler.
L'intervalle de base vient du .env (SCAN_INTERVAL_MINUTES),
mais peut être écrasé dynamiquement via les settings admin en DB.
"""
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from ..core.config import settings

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler(timezone="Europe/Paris")


async def _run():
    """Wrapper qui relit l'intervalle depuis la DB avant chaque cycle."""
    from .scraper import run_all_scans
    from ..routers.admin import _cache

    # Si le scraper est désactivé depuis l'admin, on skip le cycle
    if not _cache.get("scraper_enabled", True):
        logger.info("⏸️ Scraper désactivé depuis l'admin — cycle ignoré")
        return

    await run_all_scans()


def start_scheduler() -> None:
    interval = getattr(settings, "SCAN_INTERVAL_MINUTES", 60)
    scheduler.add_job(
        _run,
        "interval",
        minutes=interval,
        id="run_all_scans",
        replace_existing=True,
        max_instances=1,          # Jamais deux cycles en parallèle
        coalesce=True,            # Si un cycle est en retard, on n'empile pas
    )
    scheduler.start()
    logger.info(f"🚀 Scheduler démarré — scan toutes les {interval} min")
    logger.info("ℹ️  10 min d'intervalle = OK, la dédup MongoDB évite les doublons")


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("🛑 Scheduler arrêté")


def update_interval(minutes: int) -> None:
    """Appelé depuis l'admin pour changer l'intervalle à chaud."""
    if not scheduler.running:
        return
    scheduler.reschedule_job("run_all_scans", trigger="interval", minutes=minutes)
    logger.info(f"🔄 Interval mis à jour → toutes les {minutes} min")