"""
Scraping Leboncoin via site web (HTML) — utilise l'IP locale du PC.
NE PAS déployer sur Render — lancer uniquement depuis ton PC avec scanner.py
"""
import asyncio
import json
import logging
import random
from datetime import datetime
from typing import List, Dict, Optional

import httpx
from bs4 import BeautifulSoup
from ..models.models import SearchFilter, Listing
from ..core.config import settings
from .ai_analyzer import analyze_listing
from .email_service import send_alert_email

logger = logging.getLogger(__name__)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
]


def get_headers():
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Cache-Control": "max-age=0",
    }


def build_url(f: SearchFilter) -> str:
    params = []
    if f.keywords:
        params.append(f"text={f.keywords.replace(' ', '+')}")
    if f.city:
        params.append(f"locations={f.city}")
    if f.max_price:
        params.append(f"price={int(f.min_price)}-{int(f.max_price)}")
    return "https://www.leboncoin.fr/recherche?" + "&".join(params)


async def fetch_listings(f: SearchFilter) -> List[Dict]:
    url = build_url(f)
    logger.info(f"🔍 Scraping: {url}")
    await asyncio.sleep(random.uniform(3, 7))

    try:
        async with httpx.AsyncClient(headers=get_headers(), timeout=20.0, follow_redirects=True) as client:
            res = await client.get(url)
            logger.info(f"Status: {res.status_code}")

            if res.status_code != 200:
                logger.error(f"Bloqué: {res.status_code}")
                return []

            soup = BeautifulSoup(res.text, "html.parser")
            tag = soup.find("script", id="__NEXT_DATA__")
            if not tag:
                logger.warning("__NEXT_DATA__ introuvable")
                return []

            data = json.loads(tag.string)
            ads = data["props"]["pageProps"]["searchData"]["ads"]
            results = []
            for ad in ads:
                prices = ad.get("price", [])
                images = ad.get("images", {}).get("urls_large", [])
                loc = ad.get("location", {})
                results.append({
                    "listing_id": str(ad.get("list_id", "")),
                    "title": ad.get("subject", "Sans titre"),
                    "price": float(prices[0]) if prices else None,
                    "location": f"{loc.get('city', '')} ({loc.get('department_id', '')})",
                    "description": ad.get("body", "")[:500],
                    "url": f"https://www.leboncoin.fr/annonce/{ad.get('list_id')}",
                    "image_url": images[0] if images else None,
                    "seller_type": "pro" if ad.get("owner", {}).get("type") == "pro" else "particulier",
                })
            logger.info(f"✅ {len(results)} annonces trouvées pour '{f.name}'")
            return results[:settings.MAX_LISTINGS_PER_SCAN]

    except Exception as e:
        logger.error(f"Erreur scraper: {e}")
        return []


async def scan_filter(f: SearchFilter) -> int:
    raw_listings = await fetch_listings(f)
    new_count = 0

    for raw in raw_listings:
        exists = await Listing.find_one(
            Listing.listing_id == raw["listing_id"],
            Listing.filter_id == str(f.id)
        )
        if exists:
            continue

        try:
            ai = await analyze_listing(
                title=raw["title"],
                price=raw["price"],
                description=raw.get("description", ""),
                keywords=f.keywords,
                max_price=f.max_price,
            )
        except Exception as e:
            logger.error(f"Erreur IA: {e}")
            ai = {"score": 5.0, "analysis": "Analyse indisponible", "highlights": []}

        listing = Listing(
            filter_id=str(f.id),
            user_id=f.user_id,
            **raw,
            ai_score=ai["score"],
            ai_analysis=ai["analysis"],
            ai_highlights=ai["highlights"],
        )
        await listing.insert()

        if ai["score"] >= f.min_score:
            await send_alert_email(user_id=f.user_id, listing=listing, filter_name=f.name)
            listing.alert_sent = True
            await listing.save()

        new_count += 1

    f.last_scan_at = datetime.utcnow()
    await f.save()
    logger.info(f"✅ '{f.name}' → {new_count} nouvelles annonces")
    return new_count
