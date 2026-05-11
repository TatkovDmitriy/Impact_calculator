"""
Greenplum client — read-only psycopg2 wrapper.
Reads connection params from password.json (same dir as this file's parent, i.e. research/).
"""

import json
import os
import psycopg2
import psycopg2.extras
import pandas as pd
from pathlib import Path

_DEFAULT_TIMEOUT = 120  # seconds
_DEFAULT_ROW_LIMIT = 500_000

_CONFIG_PATH = Path(os.getenv("DB_PASSWORDS_PATH", str(Path(__file__).parent.parent / "password.json")))


def _load_config() -> dict:
    with open(_CONFIG_PATH, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    gp = cfg["green_plum"]
    return {
        "host":     os.getenv("GP_HOST",     gp["host"]).strip(),
        "port":     int(os.getenv("GP_PORT", str(gp["port"]))),
        "dbname":   os.getenv("GP_DB",       gp["database"]).strip(),
        "user":     os.getenv("GP_LOGIN",    gp["user"]).strip(),
        "password": os.getenv("GP_PASSWORD", gp["password"]),
    }


def _get_conn():
    p = _load_config()
    return psycopg2.connect(
        host=p["host"],
        port=p["port"],
        dbname=p["dbname"],
        user=p["user"],
        password=p["password"],
        connect_timeout=30,
        options=f"-c statement_timeout={_DEFAULT_TIMEOUT * 1000}",
    )


def query_df(sql: str, params=None, row_limit: int = _DEFAULT_ROW_LIMIT) -> pd.DataFrame:
    """Execute a read-only SQL query and return a DataFrame. Enforces SELECT/WITH only."""
    stripped = sql.strip().upper()
    if not stripped.startswith("SELECT") and not stripped.startswith("WITH"):
        raise ValueError("Only SELECT / WITH queries are allowed")

    with _get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            safe_sql = sql
            if "LIMIT" not in stripped:
                safe_sql = f"SELECT * FROM ({sql}) _q LIMIT {row_limit}"
            cur.execute(safe_sql, params)
            rows = cur.fetchall()

    return pd.DataFrame(rows)
