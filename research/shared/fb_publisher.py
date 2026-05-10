"""
Firebase publisher for research items.
Reads FIREBASE_PROJECT_ID and FIREBASE_ADMIN_CREDENTIALS_JSON from .env.
Falls back to _outbox/ if firebase_admin is unavailable or blocked.
"""

from __future__ import annotations
import json
import logging
import os
from pathlib import Path

from dotenv import load_dotenv

_ENV_PATH = Path(__file__).parent.parent / ".env"
load_dotenv(_ENV_PATH)

log = logging.getLogger(__name__)

_OUTBOX = Path(__file__).parent.parent / "_outbox"


def _save_outbox(slug: str, payload: dict) -> None:
    _OUTBOX.mkdir(exist_ok=True)
    out = _OUTBOX / f"{slug}.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2, default=str)
    log.info("Saved to outbox: %s", out)


def publish(slug: str, payload: dict) -> None:
    """Push payload to Firestore research_items/<slug>. Falls back to outbox."""
    project_id   = os.environ.get("FIREBASE_PROJECT_ID", "").strip()
    creds_path   = os.environ.get("FIREBASE_ADMIN_CREDENTIALS_JSON", "").strip()

    if not project_id or not creds_path:
        log.warning("FIREBASE_PROJECT_ID or FIREBASE_ADMIN_CREDENTIALS_JSON not set — using outbox")
        _save_outbox(slug, payload)
        return

    try:
        import firebase_admin
        from firebase_admin import credentials, firestore

        if not firebase_admin._apps:
            cred = credentials.Certificate(creds_path)
            firebase_admin.initialize_app(cred)

        db  = firestore.client()
        ref = db.collection("research_items").document(slug)
        ref.set(payload)
        log.info("Published to Firestore: research_items/%s", slug)

    except ImportError:
        log.warning("firebase_admin not installed — using outbox")
        _save_outbox(slug, payload)
    except Exception as exc:
        log.warning("Firestore error: %s — using outbox", exc)
        _save_outbox(slug, payload)
