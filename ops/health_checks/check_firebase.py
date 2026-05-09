#!/usr/bin/env python3
"""check_firebase.py — проверка Firebase Admin SDK (чтение config/access).
Exit 0 = OK, Exit 1 = critical, Exit 2 = warning.
"""
import os
import sys
from pathlib import Path


def load_env(env_file: str = "research/.env") -> None:
    env_path = Path(env_file)
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def main() -> int:
    try:
        from dotenv import load_dotenv
        load_dotenv("research/.env")
    except ImportError:
        load_env("research/.env")

    client_email = os.environ.get("FIREBASE_ADMIN_CLIENT_EMAIL")
    private_key_raw = os.environ.get("FIREBASE_ADMIN_PRIVATE_KEY")
    project_id = os.environ.get("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "impact-calc-lp")

    if not client_email or not private_key_raw:
        print("[Firebase] ⚠️   WARNING: FIREBASE_ADMIN_CLIENT_EMAIL or FIREBASE_ADMIN_PRIVATE_KEY not set")
        return 2

    # Нормализация \n escape-последовательностей
    private_key = private_key_raw.replace("\\n", "\n")

    try:
        import firebase_admin  # type: ignore
        from firebase_admin import credentials, firestore
    except ImportError:
        print("[Firebase] ⚠️   WARNING: firebase-admin not installed (pip install firebase-admin)")
        return 2

    try:
        # Инициализировать только если ещё не инициализировано
        app_name = "health_check"
        try:
            app = firebase_admin.get_app(app_name)
        except ValueError:
            cred = credentials.Certificate({
                "type": "service_account",
                "project_id": project_id,
                "client_email": client_email,
                "private_key": private_key,
                "token_uri": "https://oauth2.googleapis.com/token",
            })
            app = firebase_admin.initialize_app(cred, name=app_name)

        db = firestore.client(app)
        doc = db.collection("config").document("access").get()

        if doc.exists:
            data = doc.to_dict()
            emails = data.get("emails", [])
            print(f"[Firebase] ✅  OK         (config/access read OK, {len(emails)} email(s) in whitelist)")
            return 0
        else:
            print("[Firebase] ⚠️   WARNING: config/access document does not exist")
            return 2

    except Exception as e:
        print(f"[Firebase] ❌  CRITICAL   ({type(e).__name__}: {e})")
        return 1


if __name__ == "__main__":
    sys.exit(main())
