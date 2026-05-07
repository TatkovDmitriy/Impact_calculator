# 04 — Vercel Deploy

## Подключение

1. Залогиниться в https://vercel.com (через GitHub)
2. **Add New → Project** → выбрать репо `TatkovDmitriy/Impact_calculator`
3. Framework preset: **Next.js** (определится автоматически)
4. Root directory: оставить `./` (если код в корне репо)
5. Build & Output: дефолты Next.js
6. Перейти в **Environment Variables** и добавить все из [03_Firebase.md](03_Firebase.md)
7. Deploy

## Environment Variables

Скопировать **все** ключи из `.env.local` в Vercel: **Project → Settings → Environment Variables**.

| Переменная | Environments |
|---|---|
| `NEXT_PUBLIC_FIREBASE_*` (6 шт) | Production, Preview, Development |
| `FIREBASE_ADMIN_*` (2 шт) | Production, Preview |
| `GOOGLE_SHEETS_*` (3 шт) | Production, Preview |

> ⚠️ `GOOGLE_SHEETS_PRIVATE_KEY` содержит `\n` — в Vercel UI вставлять как есть (с реальными переводами строк), НЕ экранировать.

## Firebase Authorized Domains

После первого деплоя:

1. Узнать Vercel URL (например, `impact-calculator.vercel.app`)
2. Firebase Console → **Authentication → Settings → Authorized domains** → Add domain
3. Добавить:
   - `impact-calculator.vercel.app`
   - `impact-calculator-*-tatkovdmitriy.vercel.app` (preview-деплои — добавить wildcard или вручную после первого preview)

Без этого Firebase Auth не работает на проде.

## Google Sheets — доступ

1. Создать Service Account в Google Cloud Console (или переиспользовать существующий)
2. Скачать JSON ключ → распаковать в env vars (`GOOGLE_SHEETS_CLIENT_EMAIL`, `GOOGLE_SHEETS_PRIVATE_KEY`)
3. Открыть таблицу https://docs.google.com/spreadsheets/d/103C2StHfJg9LPr9QFB4xmwkqLc_6pPoZT7_CKo3DuwE
4. **Share** → добавить email Service Account как **Viewer**

## Кастомный домен (опционально)

После стабилизации MVP:
- Купить домен или использовать поддомен от существующего
- Vercel → **Project → Settings → Domains** → Add
- Прописать DNS-записи по инструкции Vercel
- Добавить новый домен в Firebase Authorized Domains

## CI/CD

- **main branch** → авто-деплой в Production
- **любая другая ветка / PR** → Preview deploy с уникальным URL
- Build падает на TypeScript ошибках (strict mode) и lint-ошибках — это by design

## Чек-лист первого деплоя

- [ ] Репо подключён к Vercel
- [ ] Все env vars добавлены (3 environment'а)
- [ ] Build прошёл успешно
- [ ] Vercel URL добавлен в Firebase Authorized Domains
- [ ] Service Account email добавлен в Sheets как Viewer
- [ ] Логин email/password работает
- [ ] Запрос к `/api/sheets` возвращает данные
- [ ] Сохранение сценария → видно в Firestore Console
