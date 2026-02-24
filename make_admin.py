#!/usr/bin/env python3
"""
Script à lancer UNE SEULE FOIS pour te passer admin.
Usage: python make_admin.py votre@email.com

Lance depuis la racine du projet :
  python make_admin.py ton@email.com
"""
import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from backend.models.models import User
from backend.core.config import settings


async def main(email: str):
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(database=client.get_default_database(), document_models=[User])

    user = await User.find_one(User.email == email)
    if not user:
        print(f"❌ Utilisateur '{email}' introuvable. Crée d'abord un compte sur le site.")
        return

    user.is_admin = True
    await user.save()
    print(f"✅ {email} est maintenant ADMIN !")
    print(f"   Accède au panel sur /admin")
    client.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python make_admin.py votre@email.com")
        sys.exit(1)
    asyncio.run(main(sys.argv[1]))
