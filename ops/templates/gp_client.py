"""
gp_client.py — Read-only Greenplum client (psycopg2 wrapper).
Скопировать в: research/shared/gp_client.py
Требует: research/.env с GP_HOST, GP_PORT, GP_DATABASE, GP_USER, GP_PASSWORD
"""
import os
import psycopg2
import psycopg2.extras
from pathlib import Path
from dotenv import load_dotenv

_ENV_PATH = Path(__file__).parent.parent / ".env"
load_dotenv(_ENV_PATH)

_QUERY_TIMEOUT_MS = 120_000  # 2 минуты — убивает зависшие запросы


def _get_connection():
    return psycopg2.connect(
        host=os.environ["GP_HOST"],
        port=int(os.environ.get("GP_PORT", 5432)),
        dbname=os.environ["GP_DATABASE"],
        user=os.environ["GP_USER"],
        password=os.environ["GP_PASSWORD"],
        options=f"-c statement_timeout={_QUERY_TIMEOUT_MS}",
        connect_timeout=30,
    )


def run_query(sql: str, params=None) -> list[dict]:
    """Execute SELECT query, return list of dicts. Только SELECT."""
    with _get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            return [dict(row) for row in cur.fetchall()]


def run_query_df(sql: str, params=None):
    """Execute SELECT query, return pandas DataFrame."""
    import pandas as pd
    rows = run_query(sql, params)
    return pd.DataFrame(rows)
