"""
Firebase publisher — пушит research_item в Firestore.
Fallback: если Firebase недоступен (корп файрвол), сохраняет в _outbox/<slug>.json
"""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

_ENV_PATH = Path(__file__).parent.parent / ".env"
load_dotenv(_ENV_PATH)

log = logging.getLogger(__name__)

_OUTBOX = Path(__file__).parent.parent / "_outbox"


class FbPublisher:
    def publish(self, slug: str, doc: dict) -> None:
        """Пушит документ в Firestore research_items/{slug}.
        При ошибке сети — сохраняет в _outbox для ручной загрузки."""
        doc_with_ts = {**doc}
        doc_with_ts.setdefault("meta", {})["lastRefreshedAt"] = (
            datetime.now(timezone.utc).isoformat()
        )

        project_id = os.getenv("FIREBASE_PROJECT_ID")
        creds_path = os.getenv("FIREBASE_ADMIN_CREDENTIALS_JSON")

        if not project_id or not creds_path:
            log.warning(
                "FIREBASE_PROJECT_ID или FIREBASE_ADMIN_CREDENTIALS_JSON не заданы — "
                "сохраняю в _outbox"
            )
            self._save_outbox(slug, doc_with_ts)
            return

        try:
            import firebase_admin
            from firebase_admin import credentials, firestore

            if not firebase_admin._apps:
                cred = credentials.Certificate(creds_path)
                firebase_admin.initialize_app(cred, {"projectId": project_id})

            db = firestore.client()
            db.collection("research_items").document(slug).set(doc_with_ts)
            log.info("Firestore OK: research_items/%s", slug)

        except Exception as exc:
            log.error("Firestore недоступен (%s) — сохраняю в _outbox", exc)
            self._save_outbox(slug, doc_with_ts)

    def _save_outbox(self, slug: str, doc: dict) -> None:
        _OUTBOX.mkdir(exist_ok=True)
        out = _OUTBOX / f"{slug}.json"
        with open(out, "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False, indent=2, default=str)
        log.info("Сохранено в _outbox: %s", out)
        log.info(
            "Для ручной загрузки: python ops/scripts/upload_outbox.py %s", slug
        )
