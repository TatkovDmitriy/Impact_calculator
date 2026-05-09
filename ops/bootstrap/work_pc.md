# Bootstrap — Рабочий ПК (DA / research-скрипты)

> Цель: self-service настройка среды для публикации аналитики из Greenplum в Firestore.
> Выполняется через **RDP-сессию с личного ПК** (AnyDesk/RDP → рабочий ПК).
> Claude Code на рабочем ПК НЕ используется — всё делается вручную по этому документу.
> Логи копируются через буфер обмена RDP в PM-чат.
> Время: ~30 минут после прохождения диагностики.

---

## Шаг 0 — Перед началом: диагностика

Скачать и запустить диагностический скрипт, чтобы понять что работает.

```
# Скачать (в браузере):
# https://raw.githubusercontent.com/TatkovDmitriy/Impact_calculator/main/ops/diagnostics/work_pc_check.py
# Сохранить как work_pc_check.py в любую папку

python work_pc_check.py
```

Скопировать весь вывод в markdown-блоке и отправить в PM-чат.

**PM принимает решение по итогу:**
- 🟢 GO → продолжать шаги 1–6 ниже
- 🟡 NEEDS_FIX → PM выдаст инструкцию по проблемному пункту, затем повторный diagnostic
- 🔴 BLOCKED → эскалация PM (критические проблемы требуют решения IT)

**Path A (Firebase доступен):** шаги 1–6 стандартные.

**Path B (Firebase заблокирован, firestore.googleapis.com ❌):** дополнительно Шаг 7 — outbox workflow.

---

## Шаг 1 — Клонировать репозиторий

```
git clone https://github.com/TatkovDmitriy/Impact_calculator.git
cd Impact_calculator
```

Если уже есть старая версия:
```
cd Impact_calculator
git pull origin main
```

**Проверка:** `git log --oneline -1` показывает последний коммит.

---

## Шаг 2 — Создать рабочие директории

```
mkdir research
mkdir research\scripts
mkdir research\shared
mkdir research\_outbox
```

> `research/` в `.gitignore` — содержимое никогда не попадёт в репо автоматически.
> DA-агент создаёт скрипты в `research/scripts/`.

---

## Шаг 3 — Создать Python venv

```
python -m venv research\.venv
research\.venv\Scripts\activate
python --version
```

**Ожидание:** `(research\.venv)` появился в приглашении командной строки, Python 3.9+.

---

## Шаг 4 — Установить зависимости

### Path A (pip работает, PyPI открыт)

```
pip install psycopg2-binary firebase-admin pandas python-dotenv
pip list | findstr /i "psycopg2 firebase pandas dotenv"
```

**Ожидание:** все 4 пакета показаны в списке.

### Path B (PyPI заблокирован)

Вариант 4b-1: если есть conda (Anaconda/Miniconda):
```
conda install -c conda-forge psycopg2 pandas
pip install firebase-admin python-dotenv
```

Вариант 4b-2: перенести wheel-файлы с личного ПК:
```
# На личном ПК (в git bash или cmd):
pip download psycopg2-binary firebase-admin pandas python-dotenv -d C:\temp\wheels

# Скопировать C:\temp\wheels\ на рабочий ПК (USB, shared drive)
# На рабочем ПК:
pip install --no-index --find-links=C:\temp\wheels psycopg2-binary firebase-admin pandas python-dotenv
```

---

## Шаг 5 — Настроить переменные окружения

```
copy .env.example research\.env
notepad research\.env
```

Заполнить в `research\.env`:

| Переменная | Значение |
|---|---|
| `FIREBASE_ADMIN_CLIENT_EMAIL` | `firebase-adminsdk-fbsvc@impact-calc-lp.iam.gserviceaccount.com` |
| `FIREBASE_ADMIN_PRIVATE_KEY` | приватный ключ из `.json` файла SA (строка в кавычках, `\n` как escape) |
| `GP_HOST` | хост Greenplum от администратора БД |
| `GP_PORT` | обычно `5432` |
| `GP_DATABASE` | имя БД от администратора |
| `GP_USER` | корпоративный логин |
| `GP_PASSWORD` | корпоративный пароль |

`NEXT_PUBLIC_*` и `GOOGLE_SHEETS_*` в `research\.env` **не нужны**.

**Получить Firebase Admin key:** Firebase Console → Project Settings → Service accounts →
**Generate new private key** → скачать `.json` → скопировать на рабочий ПК в безопасное место
(НЕ внутри папки репо).

---

## Шаг 6 — Smoke test: запустить health checks

```
.\ops\health_checks\check_all.ps1
```

Если PowerShell запрещён:
```
python ops\health_checks\check_firebase.py
python ops\health_checks\check_gp.py
```

**Ожидание:**
- Firebase ✅ ИЛИ Firebase ❌ (→ Path B outbox workflow, см. Шаг 7)
- Greenplum ✅ (если VPN подключён)

Отправить вывод в PM-чат.

---

## Шаг 7 — Path B: Outbox workflow (только если Firebase заблокирован)

Если `firestore.googleapis.com` недоступен — результаты publish.py сохраняются в
`ops/_outbox/` и синхронизируются через git:

```
# После DA-сессии (research/scripts/publish.py упадёт с network error
# и автоматически сохранит данные в ops/_outbox/)

git add ops/_outbox/
git commit -m "data: outbox results from work PC"
git push origin main
```

На **личном ПК** после pull:
```
git pull origin main
python ops\scripts\upload_outbox.py
```

Подробнее: [docs/11_DevOps.md](../../docs/11_DevOps.md) → раздел «Path B Outbox».

---

## Шаг 7 (опционально) — Ярлык run_research.bat на рабочем столе

Создаёт однокнопочный запуск research-скрипта без ручных команд. Установить после того как DA создаст первый рабочий скрипт в Phase R1.

**Скопировать батник** (один раз после bootstrap):
```
copy ops\scripts\run_research.bat %USERPROFILE%\Desktop\run_research.bat
```

**Использование:**
- Дабл-клик на ярлык → ввести slug → Enter
- Скрипт: `git pull` → venv → запуск → авто-коммит outbox (если Path B)
- Весь RDP-сеанс занимает ~30 секунд

---

## Ежедневный ритуал (когда ярлык установлен)

1. Открыть RDP-сессию на рабочий ПК
2. Дабл-клик `run_research.bat` на рабочем столе
3. Ввести slug
4. Скопировать вывод в PM-чат через буфер обмена RDP
5. Закрыть RDP-сессию

---

## Troubleshooting

**`python -m venv` падает:**
```
pip install virtualenv
virtualenv research\.venv
```

**`check_firebase.py` — PermissionDenied / CERTIFICATE_VERIFY_FAILED:**
Корпоративный прокси перехватывает TLS → Path B активируется автоматически.

**`check_gp.py` — connection refused:**
Проверить VPN-подключение (Cisco AnyConnect должен показывать Connected).

**`research\.venv\Scripts\activate` — execution policy:**
```
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
