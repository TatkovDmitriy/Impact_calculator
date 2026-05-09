"""
Greenplum client — read-only psycopg2 wrapper.
Reads connection params from .env in the research/ root.
"""

import os
import psycopg2
import psycopg2.extras
import pandas as pd
from pathlib import Path
from dotenv import load_dotenv

_ENV_PATH = Path(__file__).parent.parent / ".env"
load_dotenv(_ENV_PATH)

_DEFAULT_TIMEOUT = 120  # seconds
_DEFAULT_ROW_LIMIT = 500_000


def _get_conn():
    return psycopg2.connect(
        host=os.environ["GP_HOST"],
        port=int(os.environ.get("GP_PORT", 5432)),
        dbname=os.environ["GP_DATABASE"],
        user=os.environ["GP_USER"],
        password=os.environ["GP_PASSWORD"],
        connect_timeout=30,
        options=f"-c statement_timeout={_DEFAULT_TIMEOUT * 1000}",
    )


def query_df(sql: str, params=None, row_limit: int = _DEFAULT_ROW_LIMIT) -> pd.DataFrame:
    """Execute a read-only SQL query and return a DataFrame. Enforces SELECT-only."""
    stripped = sql.strip().upper()
    if not stripped.startswith("SELECT") and not stripped.startswith("WITH"):
        raise ValueError("Only SELECT / WITH queries are allowed")

    with _get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Wrap in LIMIT guard if none present
            safe_sql = sql
            if "LIMIT" not in stripped:
                safe_sql = f"SELECT * FROM ({sql}) _q LIMIT {row_limit}"
            cur.execute(safe_sql, params)
            rows = cur.fetchall()

    return pd.DataFrame(rows)
