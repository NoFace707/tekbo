import os
from pathlib import Path

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials

from .models import User

BASE_DIR = Path(__file__).resolve().parent.parent


def get_firebase_app():
    if not firebase_admin._apps:
        service_account_path = os.getenv(
            "FIREBASE_SERVICE_ACCOUNT_PATH",
            BASE_DIR / "firebase-service-account.json.json",
        )
        if not isinstance(service_account_path, str):
            service_account_path = str(service_account_path)
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred)
    return firebase_admin.get_app()


def verify_firebase_id_token(id_token: str) -> dict:
    get_firebase_app()
    try:
        return firebase_auth.verify_id_token(id_token)
    except Exception as exc:
        raise ValueError("Firebase ID token inválido.") from exc


def get_or_create_user_by_email(email: str) -> User:
    user = User.objects.filter(email__iexact=email).first()
    if user:
        return user

    username_base = email.split("@", 1)[0] or "usuario"
    username = username_base
    padding = 0
    while User.objects.filter(username=username).exists():
        padding += 1
        username = f"{username_base}{padding}"

    user = User(username=username, email=email)
    user.set_unusable_password()
    user.save()
    return user
