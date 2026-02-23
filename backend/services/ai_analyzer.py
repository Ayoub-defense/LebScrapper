import json
import logging
from groq import AsyncGroq
from ..core.config import settings

logger = logging.getLogger(__name__)


async def analyze_listing(title: str, price, description: str, keywords: str, max_price) -> dict:
    if not settings.GROQ_API_KEY:
        return {"score": 5.0, "analysis": "Clé Groq manquante", "highlights": []}

    client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    price_str = f"{price}€" if price else "non mentionné"
    budget_str = f"Budget max: {max_price}€" if max_price else ""

    prompt = f"""Analyse cette annonce Leboncoin et donne un score de 1 à 10.
Titre: {title}
Prix: {price_str}
Description: {(description or '')[:400]}
Recherche: "{keywords}". {budget_str}

Critères: prix par rapport au marché, état apparent, cohérence de l'annonce, rapport qualité/prix.
Réponds UNIQUEMENT en JSON valide: {{"score": <1-10>, "analysis": "<2 phrases max>", "highlights": ["<point positif>", "<point positif>"]}}"""

    try:
        response = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "Tu analyses des annonces de véhicules. Réponds uniquement en JSON valide, sans markdown."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=300,
            response_format={"type": "json_object"},
        )
        result = json.loads(response.choices[0].message.content)
        return {
            "score": round(max(1.0, min(10.0, float(result.get("score", 5)))), 1),
            "analysis": result.get("analysis", ""),
            "highlights": result.get("highlights", [])[:4],
        }
    except Exception as e:
        logger.error(f"Erreur analyse IA: {e}")
        return {"score": 5.0, "analysis": "Analyse indisponible", "highlights": []}
