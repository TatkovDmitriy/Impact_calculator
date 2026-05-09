#!/usr/bin/env python3
"""
work_pc_check.py — Impact Calculator: диагностика рабочего ПК
Запуск: python work_pc_check.py
Требования: Python 3.7+, только стандартная библиотека.
Вывод: markdown-отчёт для копирования в PM-чат.
"""

import sys
import os
import socket
import subprocess
import importlib.util
import platform
import tempfile
import datetime

# ─── Конфигурация ─────────────────────────────────────────────────────────────

REQUIRED_PACKAGES = [
    ("psycopg2",       "psycopg2-binary", "Greenplum connector"),
    ("firebase_admin", "firebase-admin",  "Firebase Admin SDK"),
    ("pandas",         "pandas",          "DataFrames для research"),
    ("dotenv",         "python-dotenv",   "Загрузка .env файлов"),
]

NETWORK_PROBES = [
    ("github.com",                    443, "Git remote — должен работать"),
    ("firestore.googleapis.com",      443, "Firestore API — нужен для push"),
    ("oauth2.googleapis.com",         443, "Google OAuth — нужен для SA auth"),
    ("firebaseio.com",                443, "Firebase RT DB / Admin"),
    ("pypi.org",                      443, "PyPI — нужен для pip install"),
    ("files.pythonhosted.org",        443, "PyPI files"),
]

TIMEOUT = 5  # секунд на TCP-пробу

# ─── Helpers ──────────────────────────────────────────────────────────────────

def ok(msg):   return f"✅  {msg}"
def warn(msg): return f"⚠️   {msg}"
def fail(msg): return f"❌  {msg}"

def probe_tcp(host: str, port: int) -> tuple[bool, str]:
    try:
        with socket.create_connection((host, port), timeout=TIMEOUT):
            return True, "open"
    except socket.timeout:
        return False, "timeout"
    except ConnectionRefusedError:
        return False, "refused"
    except OSError as e:
        return False, str(e)

def run_cmd(*args) -> tuple[int, str]:
    try:
        result = subprocess.run(
            list(args), capture_output=True, text=True, timeout=10
        )
        return result.returncode, (result.stdout + result.stderr).strip()
    except FileNotFoundError:
        return -1, "command not found"
    except Exception as e:
        return -1, str(e)

def check_package(import_name: str) -> bool:
    return importlib.util.find_spec(import_name) is not None

# ─── Checks ───────────────────────────────────────────────────────────────────

def section_system():
    lines = ["## 1. Системная информация", ""]
    lines.append(f"| Параметр | Значение |")
    lines.append(f"|---|---|")
    lines.append(f"| OS | {platform.system()} {platform.release()} ({platform.machine()}) |")
    lines.append(f"| Python | {sys.version.split()[0]} (path: {sys.executable}) |")
    lines.append(f"| Дата диагностики | {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')} |")
    lines.append("")
    return lines

def section_python():
    lines = ["## 2. Python & pip", ""]
    py_version = sys.version_info
    py_ok = py_version >= (3, 9)
    py_str = f"{py_version.major}.{py_version.minor}.{py_version.micro}"
    status = ok(f"Python {py_str}") if py_ok else fail(f"Python {py_str} — нужна 3.9+")
    lines.append(status)

    # pip
    code, out = run_cmd("pip", "--version")
    if code == 0:
        lines.append(ok(f"pip: {out.split()[1] if len(out.split()) > 1 else out}"))
    else:
        code2, out2 = run_cmd("pip3", "--version")
        if code2 == 0:
            lines.append(ok(f"pip3: {out2.split()[1] if len(out2.split()) > 1 else out2}"))
        else:
            lines.append(warn("pip не найден — зависимости нельзя установить через pip"))

    # git
    code, out = run_cmd("git", "--version")
    if code == 0:
        lines.append(ok(f"git: {out}"))
    else:
        lines.append(fail("git не найден"))

    lines.append("")
    return lines, py_ok

def section_packages():
    lines = ["## 3. Python-пакеты", ""]
    lines.append("| Пакет | Статус | Зачем |")
    lines.append("|---|---|---|")
    all_present = True
    for import_name, pip_name, purpose in REQUIRED_PACKAGES:
        found = check_package(import_name)
        status = "✅ установлен" if found else "❌ отсутствует"
        if not found:
            all_present = False
        lines.append(f"| `{pip_name}` | {status} | {purpose} |")
    lines.append("")
    if not all_present:
        lines.append(warn("Для установки: `pip install psycopg2-binary firebase-admin pandas python-dotenv`"))
        lines.append("")
    return lines, all_present

def section_network():
    lines = ["## 4. Сетевые пробы (TCP port 443, таймаут 5с)", ""]
    lines.append("| Хост | Порт | Статус | Назначение |")
    lines.append("|---|---|---|---|")
    results = {}
    for host, port, purpose in NETWORK_PROBES:
        reachable, detail = probe_tcp(host, port)
        icon = "✅" if reachable else "❌"
        results[host] = reachable
        lines.append(f"| `{host}` | {port} | {icon} {detail} | {purpose} |")
    lines.append("")

    firebase_ok = (
        results.get("firestore.googleapis.com", False) and
        results.get("oauth2.googleapis.com", False)
    )
    if not firebase_ok:
        lines.append(warn("Firebase endpoints недоступны — Path B (outbox fallback) будет активирован"))
    else:
        lines.append(ok("Firebase endpoints открыты — прямой push возможен"))
    lines.append("")
    return lines, results

def section_greenplum(network_results):
    lines = ["## 5. Greenplum (корпоративная БД)", ""]
    gp_host = os.environ.get("GP_HOST")
    gp_port = int(os.environ.get("GP_PORT", "5432"))
    if not gp_host:
        lines.append(warn("GP_HOST не задан в переменных окружения — пропускаем"))
        lines.append("Задать: `set GP_HOST=<host>` перед запуском скрипта")
        lines.append("")
        return lines, None
    reachable, detail = probe_tcp(gp_host, gp_port)
    if reachable:
        lines.append(ok(f"Greenplum TCP {gp_host}:{gp_port} — открыт"))
    else:
        lines.append(fail(f"Greenplum TCP {gp_host}:{gp_port} — {detail} (VPN подключён?)"))
    lines.append("")
    return lines, reachable

def section_write_perms():
    lines = ["## 6. Права на запись", ""]
    try:
        with tempfile.NamedTemporaryFile(dir=".", delete=True, suffix=".tmp") as f:
            f.write(b"test")
        lines.append(ok("Запись файлов в текущую директорию — OK"))
        writable = True
    except Exception as e:
        lines.append(fail(f"Нет прав на запись в текущую директорию: {e}"))
        writable = False
    lines.append("")
    return lines, writable

# ─── Verdict ──────────────────────────────────────────────────────────────────

def verdict(py_ok, packages_ok, network_results, gp_ok, write_ok):
    github_ok = network_results.get("github.com", False)
    firebase_ok = (
        network_results.get("firestore.googleapis.com", False) and
        network_results.get("oauth2.googleapis.com", False)
    )
    pypi_ok = network_results.get("pypi.org", False)

    lines = ["## 7. Итог", ""]

    if not py_ok or not write_ok:
        verdict_str = "🔴  **BLOCKED** — критические проблемы, нельзя продолжать"
        fixes = []
        if not py_ok:
            fixes.append("- Обновить Python до 3.9+")
        if not write_ok:
            fixes.append("- Разобраться с правами на запись (запустить от имени администратора?)")
        lines.append(verdict_str)
        lines.extend(fixes)
    elif not github_ok or (not packages_ok and not pypi_ok):
        verdict_str = "🔴  **BLOCKED** — нет доступа к GitHub или невозможно установить пакеты"
        lines.append(verdict_str)
        if not github_ok:
            lines.append("- GitHub:443 недоступен — git remote не будет работать")
        if not packages_ok and not pypi_ok:
            lines.append("- Пакеты не установлены, PyPI заблокирован — установка невозможна")
    elif not firebase_ok:
        verdict_str = "🟡  **NEEDS_FIX** — Firebase заблокирован, активировать Path B (outbox fallback)"
        lines.append(verdict_str)
        lines.append("")
        lines.append("**Path B workflow:**")
        lines.append("1. publish.py сохраняет результаты в `ops/_outbox/*.json` (git commit + push)")
        lines.append("2. Личный ПК: `git pull && python ops/scripts/upload_outbox.py`")
        lines.append("3. upload_outbox.py пушит в Firestore и очищает _outbox/")
        if not packages_ok:
            lines.append("")
            lines.append(warn("Пакеты ещё не установлены — нужно разобраться с pip или conda"))
    elif not packages_ok:
        verdict_str = "🟡  **NEEDS_FIX** — Firebase OK, но пакеты не установлены"
        lines.append(verdict_str)
        if pypi_ok:
            lines.append(ok("PyPI доступен — `pip install psycopg2-binary firebase-admin pandas python-dotenv`"))
        else:
            lines.append(warn("PyPI заблокирован — установить пакеты через conda или перенести wheel-файлы"))
    else:
        verdict_str = "🟢  **GO** — всё готово к bootstrap рабочего ПК"
        lines.append(verdict_str)
        if not gp_ok and gp_ok is not None:
            lines.append("")
            lines.append(warn("Greenplum недоступен — проверить VPN перед DA-сессией"))

    lines.append("")
    return lines

# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    print("```markdown")
    print("# Impact Calculator — Work PC Diagnostic Report")
    print(f"Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print()

    all_lines = []

    sys_lines = section_system()
    all_lines.extend(sys_lines)

    py_lines, py_ok = section_python()
    all_lines.extend(py_lines)

    pkg_lines, packages_ok = section_packages()
    all_lines.extend(pkg_lines)

    net_lines, network_results = section_network()
    all_lines.extend(net_lines)

    gp_lines, gp_ok = section_greenplum(network_results)
    all_lines.extend(gp_lines)

    write_lines, write_ok = section_write_perms()
    all_lines.extend(write_lines)

    v_lines = verdict(py_ok, packages_ok, network_results, gp_ok, write_ok)
    all_lines.extend(v_lines)

    for line in all_lines:
        print(line)

    print("```")

if __name__ == "__main__":
    main()
