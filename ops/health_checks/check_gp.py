#!/usr/bin/env python3
"""check_gp.py — проверка подключения к Greenplum.
Exit 0 = OK, Exit 1 = critical (нет соединения), Exit 2 = warning.
"""
import os
import sys
from pathlib import Path


def load_env(env_file: str = "research/.env") -> None:
    """Загрузить переменные из .env файла если python-dotenv не установлен."""
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

    host = os.environ.get("GP_HOST")
    port = os.environ.get("GP_PORT", "5432")
    database = os.environ.get("GP_DATABASE")
    user = os.environ.get("GP_USER")
    password = os.environ.get("GP_PASSWORD")

    missing = [k for k, v in {"GP_HOST": host, "GP_DATABASE": database,
                               "GP_USER": user, "GP_PASSWORD": password}.items() if not v]
    if missing:
        print(f"[Greenplum]⚠️   WARNING: missing env vars: {', '.join(missing)}")
        return 2

    try:
        import psycopg2  # type: ignore
    except ImportError:
        print("[Greenplum]⚠️   WARNING: psycopg2 not installed (pip install psycopg2-binary)")
        return 2

    try:
        conn = psycopg2.connect(
            host=host,
            port=int(port),
            database=database,
            user=user,
            password=password,
            connect_timeout=5,
        )
        cur = conn.cursor()
        cur.execute("SELECT 1")
        result = cur.fetchone()
        cur.close()
        conn.close()

        if result and result[0] == 1:
            print(f"[Greenplum]✅  OK         (SELECT 1 returned {result[0]}, host={host})")
            return 0
        else:
            print("[Greenplum]❌  ERROR      (unexpected query result)")
            return 1

    except psycopg2.OperationalError as e:
        print(f"[Greenplum]❌  CRITICAL   ({e})")
        return 1
    except Exception as e:
        print(f"[Greenplum]❌  ERROR      ({type(e).__name__}: {e})")
        return 1


if __name__ == "__main__":
    sys.exit(main())
