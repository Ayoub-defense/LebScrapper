import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from ..core.config import settings
from ..models.models import Listing, Alert, User

logger = logging.getLogger(__name__)


def build_email_html(title, price, url, location, score, analysis, highlights, filter_name, user_name):
    price_str = f"{int(price):,}€".replace(",", " ") if price else "Prix non mentionné"
    score_color = "#22c55e" if score >= 8.5 else "#f59e0b" if score >= 7 else "#ef4444"
    highlights_html = "".join(
        f'<li style="margin:5px 0;color:#d4d4d8;font-size:13px;list-style:none">✓ {h}</li>'
        for h in (highlights or [])
    )
    return f"""<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#09090b;font-family:'Helvetica Neue',Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
  <div style="text-align:center;margin-bottom:24px">
    <div style="display:inline-block;background:#18181b;border:1px solid rgba(251,191,36,.25);border-radius:12px;padding:10px 20px">
      <span style="background:#fbbf24;color:#000;font-weight:900;font-size:12px;padding:3px 8px;border-radius:6px;margin-right:6px">D</span>
      <span style="color:#fff;font-weight:700;font-size:14px">DealHunter <span style="color:#fbbf24">AI</span></span>
    </div>
  </div>
  <div style="background:#18181b;border:1px solid rgba(255,255,255,.08);border-radius:20px;overflow:hidden">
    <div style="background:#1c1917;padding:20px 24px;border-bottom:1px solid rgba(255,255,255,.06)">
      <div style="font-size:11px;color:#78716c;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:5px">Filtre : {filter_name}</div>
      <div style="font-size:21px;font-weight:800;color:#fff">🎯 Bonne affaire trouvée !</div>
      <div style="font-size:13px;color:#a8a29e;margin-top:4px">Bonjour {user_name}, voici une annonce qui correspond à vos critères.</div>
    </div>
    <div style="padding:24px">
      <div style="text-align:center;margin-bottom:20px">
        <span style="background:{score_color};color:#fff;font-size:22px;font-weight:900;padding:10px 30px;border-radius:50px;display:inline-block">
          ⭐ {score}/10
        </span>
      </div>
      <div style="background:#09090b;border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:16px;margin-bottom:16px">
        <div style="font-size:16px;font-weight:700;color:#fff;margin-bottom:10px;line-height:1.35">{title}</div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center">
          {f'<span style="font-size:24px;font-weight:900;color:#fbbf24">{price_str}</span>' if price else ''}
          {f'<span style="font-size:12px;color:#71717a">📍 {location}</span>' if location else ''}
        </div>
      </div>
      <div style="background:rgba(251,191,36,.05);border:1px solid rgba(251,191,36,.15);border-radius:14px;padding:16px;margin-bottom:20px">
        <div style="font-size:11px;color:#fbbf24;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">🤖 Analyse IA</div>
        <p style="color:#d4d4d8;font-size:13px;line-height:1.6;margin:0 0 10px 0">{analysis}</p>
        {f'<ul style="margin:0;padding:0">{highlights_html}</ul>' if highlights_html else ''}
      </div>
      <div style="text-align:center">
        <a href="{url}" target="_blank"
           style="display:inline-block;background:#fbbf24;color:#000;font-weight:800;font-size:15px;text-decoration:none;padding:14px 36px;border-radius:14px">
          Voir l'annonce sur Leboncoin →
        </a>
      </div>
    </div>
  </div>
  <p style="text-align:center;color:#3f3f46;font-size:11px;margin-top:20px">
    DealHunter AI · Surveillance automatique Leboncoin<br>
    <a href="{settings.APP_URL}/dashboard" style="color:#71717a;text-decoration:underline">Gérer mes alertes</a>
  </p>
</div>
</body>
</html>"""


async def send_alert_email(user_id: str, listing: Listing, filter_name: str):
    if not settings.GMAIL_APP_PASSWORD:
        logger.error("❌ GMAIL_APP_PASSWORD manquante — email non envoyé")
        return

    user = await User.get(user_id)
    if not user:
        logger.error(f"❌ Utilisateur {user_id} introuvable")
        return

    user_name = user.full_name or user.email.split("@")[0]
    price_display = f" · {int(listing.price):,}€".replace(",", " ") if listing.price else ""
    subject = f"🎯 {listing.ai_score}/10 — {listing.title[:55]}{price_display}"

    html = build_email_html(
        title=listing.title,
        price=listing.price,
        url=listing.url,
        location=listing.location,
        score=listing.ai_score or 0,
        analysis=listing.ai_analysis or "",
        highlights=listing.ai_highlights,
        filter_name=filter_name,
        user_name=user_name,
    )

    email_status = "failed"
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"DealHunter AI <{settings.GMAIL_ADDRESS}>"
        msg["To"] = user.email
        msg.attach(MIMEText(html, "html"))

        logger.info(f"📧 Envoi email à {user.email}")
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(settings.GMAIL_ADDRESS, settings.GMAIL_APP_PASSWORD)
            smtp.sendmail(settings.GMAIL_ADDRESS, user.email, msg.as_string())

        logger.info(f"✅ Email envoyé à {user.email}")
        email_status = "sent"
    except Exception as e:
        logger.error(f"❌ Erreur Gmail SMTP: {type(e).__name__}: {e}")

    try:
        await Alert(
            user_id=user_id,
            listing_id=str(listing.id),
            listing_title=listing.title,
            listing_price=listing.price,
            listing_url=listing.url,
            ai_score=listing.ai_score or 0,
            email_status=email_status,
        ).insert()
    except Exception as e:
        logger.error(f"❌ Erreur sauvegarde alerte: {e}")
