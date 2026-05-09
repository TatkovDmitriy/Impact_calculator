# 11 — DevOps & Infrastructure

> Canonical infra-документ. Владелец — DevOps-агент (agents/05_DevOps_Agent.md).
> Зеркало: D:\Obsidian\...\Pet_Projects\Impact_Calculator\11_DevOps.md

## Физическая архитектура

```
┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
│ ЛИЧНЫЙ ПК (dev)     │   │ РАБОЧИЙ ПК (data)   │   │ CLOUD (production)  │
│                     │   │                     │   │                     │
│ Node 20+, npm       │   │ Python 3.11+, venv  │   │ Vercel (Next.js)    │
│ Next.js dev server  │   │ Cisco VPN ↔ corp    │   │ Firebase Auth+FS    │
│ Vercel CLI          │   │ Greenplum client    │   │ GitHub remote       │
│ git, gh             │   │ git (только)        │   │                     │
│ Claude Code (DEV)   │   │ Firebase Admin SDK  │   │                     │
│                     │   │ ⚠️ NO Claude Code   │   │                     │
│ source-of-truth:    │   │ source-of-truth:    │   │ source-of-truth:    │
│ web-код             │   │ research-скрипты    │   │ продакшен-данные    │
└──────────┬──────────┘   └──────────┬──────────┘   └──────────┬──────────┘
           │                         │                         │
           └───────────── git push/pull (GitHub) ──────────────┘
                                     │
                              Path A (Firebase OK): Admin SDK ──▶ Firestore
                              Path B (FB blocked):  _outbox/ → git push → личный ПК
```

**Правило:** любая машина начинает работу с `git pull`.

> **PIVOT (2026-05-09):** Claude Code недоступен на корпоративном рабочем ПК (IT-ограничение).
> DA-агент живёт на **личном ПК**, пишет скрипты «вслепую» (без прямого доступа к Greenplum).
> DA тестирует на синтетических данных локально; рабочий ПК запускает готовые скрипты вручную.

---

## Репозиторий

| Параметр | Значение |
|---|---|
| GitHub | https://github.com/TatkovDmitriy/Impact_calculator |
| Локальный путь (личный ПК) | `d:\claude code\vs code\My Project\impact_calculator\` |
| Git root | `impact_calculator/` (папка = git root) |
| Vercel Root Directory | `impact_calculator` (критично — см. docs/04_Vercel_Deploy.md) |
| Production URL | https://impact-calculator-beryl.vercel.app |
| Main branch | `main` — единственный для обоих ПК |

### Структура директорий (DevOps-owned выделены)

```
impact_calculator/               ← git root
├── app/, lib/, components/      ← Next.js web (DEV-owned)
├── contexts/, proxy.ts          ← Auth layer (DEV-owned)
├── docs/                        ← Документация (PM + DevOps)
├── agents/                      ← Промпты агентов (PM)
├── backlog/                     ← PM-бэклог
├── tests/                       ← E2E тесты (QA)
├── research/                    ← [gitignored] только рабочий ПК
│   └── scripts/                 ← DA-скрипты
├── ops/                         ← ★ DevOps-owned ★
│   ├── bootstrap/
│   │   ├── personal_pc.md       ← онбординг личного ПК
│   │   └── work_pc.md           ← онбординг рабочего ПК
│   ├── health_checks/
│   │   ├── check_all.ps1        ← оркестратор
│   │   ├── check_vpn.ps1
│   │   ├── check_gp.py
│   │   └── check_firebase.py
│   ├── hooks/
│   │   └── pre-commit           ← git hook (блокирует секреты)
│   └── README.md
├── .env.example                 ← ★ DevOps-owned ★ (canonical var list)
└── .gitignore                   ← ★ DevOps-owned ★
```

---

## Переменные окружения

Канонический список — в [.env.example](../.env.example). Всего **11 переменных**.

| Переменная | Окружение | Тип |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | личный ПК + Vercel | Публичная |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | личный ПК + Vercel | Публичная |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | личный ПК + Vercel | Публичная |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | личный ПК + Vercel | Публичная |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | личный ПК + Vercel | Публичная |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | личный ПК + Vercel | Публичная |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | личный ПК + Vercel + рабочий ПК | Серверная |
| `FIREBASE_ADMIN_PRIVATE_KEY` | личный ПК + Vercel + рабочий ПК | Серверная (секрет) |
| `GOOGLE_SHEETS_CLIENT_EMAIL` | личный ПК + Vercel | Серверная |
| `GOOGLE_SHEETS_PRIVATE_KEY` | личный ПК + Vercel | Серверная (секрет) |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | личный ПК + Vercel | Публичная |

Рабочий ПК дополнительно: `GP_HOST`, `GP_PORT`, `GP_DATABASE`, `GP_USER`, `GP_PASSWORD` (в `research/.env`).

### Хранение private key

`FIREBASE_ADMIN_PRIVATE_KEY` хранится как **одна строка** с `\n` как escape-символами:
```
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

В Vercel — без кавычек, напрямую. В коде делается `.replace(/\\n/g, '\n')`.

---

## Управление секретами

- **Один service account** (`firebase-adminsdk-fbsvc@impact-calc-lp.iam.gserviceaccount.com`) для обоих ПК
- Key-файл `.json` **копируется вручную** на каждую машину, никогда не через git или мессенджеры
- `.env.local` и `research/.env` — gitignored, никогда в репо
- Pre-commit hook блокирует попытку закоммитить секретный файл (см. [ops/hooks/pre-commit](../ops/hooks/pre-commit))

### Ротация ключа Firebase Admin

1. Firebase Console → Project Settings → Service accounts → **Generate new private key**
2. Скачать новый `.json`
3. Обновить `FIREBASE_ADMIN_PRIVATE_KEY` в `.env.local` (личный ПК)
4. Обновить `FIREBASE_ADMIN_PRIVATE_KEY` в Vercel env vars
5. Обновить `FIREBASE_ADMIN_PRIVATE_KEY` в `research/.env` (рабочий ПК)
6. Убедиться что Vercel redeploy прошёл успешно
7. Удалить старый key-файл с обеих машин

Плановый триггер: раз в 6 месяцев. Внеплановый: любое подозрение на утечку.

---

## Git workflow (два ПК → один main)

```
Личный ПК                    Рабочий ПК
    │                             │
    │  git pull                   │  git pull
    │  (работа с web-кодом)       │  (работа с research/)
    │  git push → main            │  git push → main
    │                             │
    └──────── Vercel авто-деплой ─┘
```

**Правила:**
1. `git pull` — первая команда любой сессии на любой машине
2. Личный ПК коммитит: `app/`, `lib/`, `docs/`, `agents/`, `ops/`
3. Рабочий ПК коммитит: `docs/09_Internal_Research.md`, `ops/runbooks/` (если нужно)
4. `research/` — gitignored, существует только на рабочем ПК
5. Конфликты разруливаем вручную, `--force` не используем
6. Commit-конвенция: `feat:` / `fix:` / `infra:` / `test:` / `docs:`

---

## Vercel & CI/CD

| Событие | Результат |
|---|---|
| push в `main` | Production deploy → `impact-calculator-beryl.vercel.app` |
| PR / любая другая ветка | Preview deploy (Vercel Deployment Protection → Playwright недоступен) |
| TypeScript ошибки | Build падает — by design |

E2E тесты запускать **только против `impact-calculator-beryl.vercel.app`** (см. docs/08_E2E_Testing.md).

---

## Firebase Admin SDK

| Параметр | Значение |
|---|---|
| Project ID | `impact-calc-lp` |
| Project number | `33131969665` |
| Service account | `firebase-adminsdk-fbsvc@impact-calc-lp.iam.gserviceaccount.com` |
| Key ID | `8451939c153ce1f991258df56b18a8e89706a851` |
| Авторизованный домен | `impact-calculator-beryl.vercel.app` ✅ |
| Firestore whitelist | `config/access.emails` (поле `emails`, не `allowedEmails`) |

Подробнее → [docs/03_Firebase.md](03_Firebase.md).

---

## Health checks

Перед каждой **DA-сессией на рабочем ПК** запускать:

```powershell
.\ops\health_checks\check_all.ps1
```

Ожидаемый вывод:
```
[VPN]      ✅  CONNECTED  (corp host reachable)
[Greenplum]✅  OK         (SELECT 1 returned 1)
[Firebase] ✅  OK         (config/access read OK)
─────────────────────────────────────────────────
All systems operational. Safe to start DA session.
```

Exit codes: 0 = все OK, 1 = есть critical, 2 = есть warning.

Скрипты: [ops/health_checks/](../ops/health_checks/)

---

## Observability

Каждый DA-скрипт `publish.py` пишет в Firestore `research_runs/{slug}_{timestamp}`:

```typescript
{
  slug: string,
  version: string,          // semver
  startedAt: Timestamp,
  finishedAt: Timestamp,
  status: 'ok' | 'error',
  errorMsg?: string,
  rowCount: number
}
```

Коллекция `research_runs` — DevOps-owned. Для просмотра: Firebase Console → Firestore → `research_runs`.

---

## Path B — Outbox Fallback (Firebase заблокирован)

Если `firestore.googleapis.com:443` недоступен на рабочем ПК (корпоративный файрвол):

```
Рабочий ПК                    Личный ПК
publish.py                    upload_outbox.py
    │                              │
    │  Firebase ❌                 │  firebase-admin ✅
    │  → ops/_outbox/slug_ts.json  │  читает _outbox/*.json
    │  git add ops/_outbox/        │  пушит в Firestore
    │  git commit                  │  удаляет файлы
    │  git push ──────────────────▶│  git commit (clean _outbox)
    │                              │  git push
```

**Рабочий ПК — после DA-сессии:**
```
git add ops/_outbox/
git commit -m "data: outbox from work PC"
git push origin main
```

**Личный ПК — после pull:**
```
git pull origin main
python ops/scripts/upload_outbox.py          # реальная загрузка
python ops/scripts/upload_outbox.py --dry-run  # проверить без загрузки
```

**Технические детали:**
- `ops/_outbox/*.json` — трекируются в git (данные, не секреты)
- `ops/_outbox/.gitkeep` — сохраняет пустую директорию
- Fallback-логика: [ops/templates/fb_publisher.py](../ops/templates/fb_publisher.py)
- Upload-скрипт: [ops/scripts/upload_outbox.py](../ops/scripts/upload_outbox.py)
- Зависимость личного ПК: `pip install firebase-admin python-dotenv`

---

## Bootstrap новой машины

| Машина | Документ |
|---|---|
| Личный ПК (web-разработка) | [ops/bootstrap/personal_pc.md](../ops/bootstrap/personal_pc.md) |
| Рабочий ПК (data-скрипты) | [ops/bootstrap/work_pc.md](../ops/bootstrap/work_pc.md) |

Диагностика рабочего ПК перед bootstrap: [ops/diagnostics/work_pc_check.py](../ops/diagnostics/work_pc_check.py)

---

## Известные подводные камни

| # | Проблема | Причина | Решение |
|---|---|---|---|
| P-01 | Vercel деплоит за 18ms без страниц | Root Directory не указан или указан неверно | Settings → Root Directory: `impact_calculator` (пересоздать проект если нужно) |
| P-02 | Auth не работает на Vercel, но работает локально | `proxy.ts` использует named export вместо `export default` | Только `export default function proxy(...)` — см. docs/04_Vercel_Deploy.md |
| P-03 | Firebase whitelist не работает | Поле называется `allowedEmails` вместо `emails` | `config/access.emails` — именно `emails` (см. docs/03_Firebase.md) |
| P-04 | `FIREBASE_ADMIN_PRIVATE_KEY` в Vercel не работает | В значение попали кавычки при импорте | Редактировать переменную вручную, убрать кавычки вокруг ключа |
