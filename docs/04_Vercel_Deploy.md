# 04 — Vercel Deploy

## Статус (2026-05-07)

| Параметр | Значение |
|---|---|
| Репо | `TatkovDmitriy/Impact_calculator` |
| Приложение | `/impact_calculator` (Next.js 16.2.5, Tailwind v4) |
| Vercel project | `impact-calculator-beryl` |
| Production URL | **https://impact-calculator-beryl.vercel.app** |
| Service Account | `firebase-adminsdk-fbsvc@impact-calc-lp.iam.gserviceaccount.com` |
| Root Directory | `impact_calculator` (критично — см. ниже) |

## Known Issues (открытые)

| ID | Severity | Описание | Статус |
|---|---|---|---|
| BUG-03 | P1 | Логин возвращает "Ошибка авторизации" — возможно FIREBASE_ADMIN_PRIVATE_KEY в Vercel с лишними кавычками | Диагностируется |

---

## ⚠️ Критическая настройка — Root Directory

Приложение находится в **подпапке** репозитория, не в корне.
При подключении к Vercel **обязательно** указывать:

```
Root Directory: impact_calculator
```

Если не указать — Vercel деплоит корень как статику (build = 18ms, страниц нет).
**Исправить постфактум через Settings нельзя — только пересоздать проект.**

---

## Первый деплой (пошагово)

1. Перейти на https://vercel.com → **Add New → Project**
2. Выбрать репо `TatkovDmitriy/Impact_calculator` → **Import**
3. **До нажатия Deploy** раскрыть секцию **"Configure Project"**
4. Установить **Root Directory: `impact_calculator`**
5. Vercel автоматически определит Framework Preset: **Next.js**
6. Build Command и Output Directory — оставить дефолты
7. Перейти в **Environment Variables** → добавить все 11 переменных (таблица ниже)
8. Нажать **Deploy**
9. Убедиться что build time **> 60 секунд** (не 18ms)

---

## Environment Variables (все 11)

Значения из `impact_calculator/.env.local`.

| Переменная | Тип |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Публичная |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Публичная |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Публичная |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Публичная |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Публичная |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Публичная |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Серверная |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Серверная (секрет) |
| `GOOGLE_SHEETS_CLIENT_EMAIL` | Серверная |
| `GOOGLE_SHEETS_PRIVATE_KEY` | Серверная (секрет) |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Серверная |

### Про FIREBASE_ADMIN_PRIVATE_KEY в Vercel

Значение должно начинаться с `-----BEGIN PRIVATE KEY-----` **без кавычек**.
Если при Import .env кавычки попали в значение — отредактировать вручную.
В коде делается `.replace(/\\n/g, '\n')` — `\n` хранятся как escape-последовательности.

---

## После деплоя — чек-лист

### Firebase Authorized Domains

1. Firebase Console → **Authentication → Settings → Authorized domains**
2. Добавить Production URL: `impact-calculator-beryl.vercel.app` ✅

### Google Sheets — доступ для Service Account

1. Открыть таблицу `103C2StHfJg9LPr9QFB4xmwkqLc_6pPoZT7_CKo3DuwE`
2. **Поделиться** → `firebase-adminsdk-fbsvc@impact-calc-lp.iam.gserviceaccount.com` → Просматривающий ✅

### Проверка после деплоя

- [ ] Build time > 60 сек, лог содержит `Route (app): /login /dashboard ...`
- [ ] `/login` открывается с брендингом ЛП (#2F3738 / #FDC300)
- [ ] Логин с реальным email → редирект на `/dashboard`
- [ ] `/dev-check` — оба чека зелёные (Firebase Auth + Baseline API)
- [ ] F12 Console — нет ошибок

---

## CI/CD

- **main branch** → авто-деплой в Production
- **любая другая ветка / PR** → Preview deploy с уникальным URL
- Build падает на TypeScript ошибках (strict mode) — by design
- Environment Variables применяются к соответствующим environments автоматически

---

## Plan B (если Root Directory снова не применился)

Создать `vercel.json` в **корне репозитория** (не в impact_calculator/):

```json
{
  "buildCommand": "cd impact_calculator && npm install && npm run build",
  "outputDirectory": "impact_calculator/.next",
  "installCommand": "cd impact_calculator && npm install"
}
```

---

## Кастомный домен (опционально, после MVP)

1. Vercel → Project → Settings → Domains → Add domain
2. Прописать DNS по инструкции Vercel
3. Добавить домен в Firebase Console → Authentication → Authorized domains
