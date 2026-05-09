#!/usr/bin/env python3
"""
upload_outbox.py — загрузить ops/_outbox/ в Firestore с личного ПК.

Workflow Path B:
  Рабочий ПК: publish.py → сетевая ошибка → ops/_outbox/*.json → git push
  Личный ПК:  git pull → python ops/scripts/upload_outbox.py → Firestore

Требования (личный ПК):
  pip install firebase-admin python-dotenv

Запуск:
  python ops/scripts/upload_outbox.py
  python ops/scripts/upload_outbox.py --dry-run   # посмотреть без загрузки
  python ops/scripts/upload_outbox.py --env path/to/.env.local
"""

import sys
import os
import json
import argparse
from pathlib import Path
from datetime import datetime, timezone

# ─── Константы ────────────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
OUTBOX_DIR = SCRIPT_DIR.parent / "_outbox"
DEFAULT_ENV = REPO_ROOT / ".env.local"
PROJECT_ID = "impact-calc-lp"


# ─── Env loading ──────────────────────────────────────────────────────────────

def load_env(env_file: Path) -> None:
    try:
        from dotenv import load_dotenv
        load_dotenv(env_file)
        return
    except ImportError:
        pass
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


# ─── Firebase ─────────────────────────────────────────────────────────────────

def get_firebase_client():
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
    except ImportError:
        print("❌  firebase-admin not installed. Run: pip install firebase-admin")
        sys.exit(1)

    client_email = os.environ.get("FIREBASE_ADMIN_CLIENT_EMAIL")
    private_key_raw = os.environ.get("FIREBASE_ADMIN_PRIVATE_KEY")
    if not client_email or not private_key_raw:
        print("❌  FIREBASE_ADMIN_CLIENT_EMAIL or FIREBASE_ADMIN_PRIVATE_KEY not set in env")
        sys.exit(1)

    private_key = private_key_raw.replace("\\n", "\n")
    app_name = "upload_outbox"
    try:
        app = firebase_admin.get_app(app_name)
    except ValueError:
        cred = credentials.Certificate({
            "type": "service_account",
            "project_id": os.environ.get("NEXT_PUBLIC_FIREBASE_PROJECT_ID", PROJECT_ID),
            "client_email": client_email,
            "private_key": private_key,
            "token_uri": "https://oauth2.googleapis.com/token",
        })
        app = firebase_admin.initialize_app(cred, name=app_name)

    return firestore.client(app)


# ─── Upload logic ─────────────────────────────────────────────────────────────

def upload_file(db, outbox_file: Path, dry_run: bool) -> bool:
    """Загрузить один файл из _outbox в Firestore. Возвращает True если успех."""
    try:
        data = json.loads(outbox_file.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, IOError) as e:
        print(f"  ⚠️  Cannot read {outbox_file.name}: {e}")
        return False

    meta = data.pop("_outbox_meta", {})
    slug = meta.get("slug") or outbox_file.stem.rsplit("_", 2)[0]

    if dry_run:
        print(f"  [DRY-RUN] Would upload: {slug} (from {outbox_file.name})")
        return True

    try:
        from firebase_admin import firestore as fs
        db.collection("research_items").document(slug).set(
            {**data, "meta": {**data.get("meta", {}), "uploadedAt": fs.SERVER_TIMESTAMP}}
        )
        print(f"  ✅  Uploaded: {slug} ({outbox_file.name})")
        return True
    except Exception as e:
        print(f"  ❌  Failed to upload {slug}: {e}")
        return False


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Upload ops/_outbox/ to Firestore")
    parser.add_argument("--dry-run", action="store_true", help="Preview without uploading")
    parser.add_argument("--env", default=str(DEFAULT_ENV), help="Path to .env file")
    args = parser.parse_args()

    load_env(Path(args.env))

    if not OUTBOX_DIR.exists():
        print(f"ops/_outbox/ not found at {OUTBOX_DIR}")
        print("Nothing to upload.")
        sys.exit(0)

    outbox_files = sorted(OUTBOX_DIR.glob("*.json"))
    if not outbox_files:
        print("ops/_outbox/ is empty. Nothing to upload.")
        sys.exit(0)

    print(f"Found {len(outbox_files)} file(s) in ops/_outbox/")
    if args.dry_run:
        print("[DRY-RUN mode — no actual uploads]\n")

    db = None if args.dry_run else get_firebase_client()

    success_files = []
    failed_files = []

    for f in outbox_files:
        if upload_file(db, f, args.dry_run):
            success_files.append(f)
        else:
            failed_files.append(f)

    # Удалить успешно загруженные файлы
    if success_files and not args.dry_run:
        print(f"\nCleaning up {len(success_files)} uploaded file(s)...")
        for f in success_files:
            f.unlink()
            print(f"  🗑️  Removed: {f.name}")

    # Итог
    print()
    if failed_files:
        print(f"⚠️  {len(failed_files)} file(s) failed — check errors above and retry")
        sys.exit(1)
    elif args.dry_run:
        print(f"[DRY-RUN] Would upload {len(success_files)} file(s)")
    else:
        print(f"✅  All {len(success_files)} file(s) uploaded successfully")
        print()
        print("Next step: commit the cleaned _outbox/")
        print("  git add ops/_outbox/ && git commit -m 'data: clear outbox after upload' && git push")


if __name__ == "__main__":
    main()
