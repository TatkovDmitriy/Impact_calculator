"""
fb_publisher.py — шаблон паблишера с outbox fallback.
DA копирует этот файл в research/shared/fb_publisher.py и дополняет своей логикой.

Fallback-механизм (Path B):
- Если push в Firestore падает с сетевой ошибкой → сохраняет в ops/_outbox/
- Личный ПК: git pull → python ops/scripts/upload_outbox.py
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


# ─── Константы ────────────────────────────────────────────────────────────────

# ops/_outbox/ относительно корня репо (два уровня вверх от research/shared/)
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
OUTBOX_DIR = _REPO_ROOT / "ops" / "_outbox"

FIREBASE_NETWORK_ERRORS = (
    "ConnectionError",
    "ConnectionRefusedError",
    "TimeoutError",
    "SSLError",
    "CERTIFICATE_VERIFY_FAILED",
    "Failed to establish",
    "Connection refused",
    "timed out",
    "503",
    "502",
)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _is_network_error(exc: Exception) -> bool:
    msg = str(exc) + type(exc).__name__
    return any(indicator in msg for indicator in FIREBASE_NETWORK_ERRORS)


def _save_to_outbox(slug: str, payload: dict[str, Any]) -> Path:
    """Сохранить payload в ops/_outbox/ для последующей загрузки с личного ПК."""
    OUTBOX_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    outfile = OUTBOX_DIR / f"{slug}_{ts}.json"
    outfile.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[OUTBOX] Saved → {outfile.relative_to(_REPO_ROOT)}", file=sys.stderr)
    return outfile


# ─── Public API ───────────────────────────────────────────────────────────────

def publish(
    slug: str,
    title: str,
    description: str,
    category: str,
    payload: dict[str, Any],
    script_version: str = "1.0.0",
) -> str:
    """
    Запушить research item в Firestore.
    Возвращает: 'PUBLISHED' | 'OUTBOX' (Path B).

    DA заменяет тело этой функции своей логикой.
    Fallback-блок (except) — не трогать.
    """
    import os

    # DA заполняет эти переменные из research/.env через dotenv
    client_email = os.environ.get("FIREBASE_ADMIN_CLIENT_EMAIL", "")
    private_key_raw = os.environ.get("FIREBASE_ADMIN_PRIVATE_KEY", "")
    project_id = os.environ.get("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "impact-calc-lp")

    if not client_email or not private_key_raw:
        raise EnvironmentError("FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY not set")

    private_key = private_key_raw.replace("\\n", "\n")
    now = datetime.now(timezone.utc)

    # DA кладёт сюда firebase_admin push логику
    # ─────────────────────────────────────────────────────────────────────────
    # Пример (DA реализует):
    #
    # import firebase_admin
    # from firebase_admin import credentials, firestore as fs
    # ...
    # db = fs.client(app)
    # db.collection("research_items").document(slug).set({
    #     "slug": slug,
    #     "title": title,
    #     "description": description,
    #     "category": category,
    #     "payload": payload,
    #     "meta": {
    #         "lastRefreshedAt": fs.SERVER_TIMESTAMP,
    #         "scriptVersion": script_version,
    #         ...
    #     }
    # })
    # return "PUBLISHED"
    #
    # ─────────────────────────────────────────────────────────────────────────
    raise NotImplementedError("DA: реализовать Firebase push в publish()")


def publish_with_fallback(
    slug: str,
    title: str,
    description: str,
    category: str,
    payload: dict[str, Any],
    script_version: str = "1.0.0",
) -> str:
    """
    Обёртка publish() с outbox-fallback.
    DA использует эту функцию в скриптах вместо publish().
    """
    try:
        result = publish(slug, title, description, category, payload, script_version)
        print(f"[FIREBASE] Published: {slug} → {result}")
        return result
    except Exception as exc:
        if _is_network_error(exc):
            print(f"[FIREBASE] Network error ({type(exc).__name__}): {exc}", file=sys.stderr)
            print("[FIREBASE] Activating Path B: saving to outbox...", file=sys.stderr)
            outbox_payload = {
                "_outbox_meta": {
                    "slug": slug,
                    "saved_at": datetime.now(timezone.utc).isoformat(),
                    "script_version": script_version,
                },
                "title": title,
                "description": description,
                "category": category,
                "payload": payload,
            }
            _save_to_outbox(slug, outbox_payload)
            return "OUTBOX"
        raise  # не сетевые ошибки пробрасываем дальше
