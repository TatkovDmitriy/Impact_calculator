# 03 — Firebase

## Выбор проекта

**Решение PM (2026-05-07):** новый проект `impact-calc-lp`. Изоляция данных от других пет-проектов, чистые лимиты Spark, отдельные Firestore Rules.

## Конфигурация

| Параметр | Значение |
|---|---|
| Project name | impact-calc-lp |
| Project ID | `impact-calc-lp` |
| Project number | `33131969665` |
| App ID | `1:33131969665:web:1b9b36c537ce2174966180` |
| Auth domain | `impact-calc-lp.firebaseapp.com` |
| Storage bucket | `impact-calc-lp.firebasestorage.app` |
| Measurement ID | `G-0DN2FF05MZ` (Analytics SDK подключён, не используем) |
| Plan | Spark (бесплатный) |

## Как создать проект (5 минут)

1. Открыть https://console.firebase.google.com → **Add project**
2. Name: `impact-calc-lp` → Continue
3. Google Analytics: отключить → **Create project**
4. **Add web app** (значок `</>`) → App nickname: `impact-calc-web` → Register
5. Скопировать firebaseConfig (apiKey, authDomain, projectId, ...) → вставить в `.env.local`
6. **Authentication → Get started → Email/Password → Enable → Save**
7. **Firestore Database → Create database → Start in production mode → Region: europe-west3**
8. Применить Security Rules из раздела ниже
9. В Firestore создать документ: `config/access` → поле `allowedEmails: ["dmtat924@gmail.com"]`

## Включённые сервисы

- [x] Authentication — Email/Password (whitelist через Firestore)
- [x] Firestore Database
- [ ] Storage — не используется
- [ ] Analytics — не подключаем

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Whitelist приглашённых
    function isAllowed() {
      return request.auth != null
        && request.auth.token.email in
           get(/databases/$(database)/documents/config/access).data.allowedEmails;
    }

    function isOwner(uid) {
      return request.auth != null && request.auth.uid == uid;
    }

    match /config/access {
      allow read: if request.auth != null;
      allow write: if false;  // только через консоль
    }

    match /users/{userId} {
      allow read: if isAllowed();
      allow write: if isOwner(userId) && isAllowed();
    }

    match /scenarios/{scenarioId} {
      allow read: if isAllowed();
      allow create: if isAllowed()
        && request.resource.data.ownerId == request.auth.uid;
      allow update, delete: if isAllowed()
        && resource.data.ownerId == request.auth.uid;
    }

    match /metrics_cache/{snapshotDate} {
      allow read: if isAllowed();
      allow write: if isAllowed();  // любой авторизованный может обновить кеш
    }
  }
}
```

## Переменные окружения (`.env.local` — НЕ коммитить)

```env
# Firebase Web SDK (публичные — попадут в бандл)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Firebase Admin SDK (только сервер — для API routes, если нужно)
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY=...

# Google Sheets API — Service Account
GOOGLE_SHEETS_CLIENT_EMAIL=...
GOOGLE_SHEETS_PRIVATE_KEY=...
GOOGLE_SHEETS_SPREADSHEET_ID=103C2StHfJg9LPr9QFB4xmwkqLc_6pPoZT7_CKo3DuwE
```

## Initial seed: whitelist

После создания Firestore:

```
config/access
  allowedEmails: [
    "dmtat924@gmail.com",
    // добавлять по мере подключения коллег
  ]
```

## Лимиты Spark

| Ресурс | Лимит | Прогноз расхода |
|---|---|---|
| Firestore reads/day | 50 000 | < 5 000 (1–10 пользователей × десятки расчётов) |
| Firestore writes/day | 20 000 | < 1 000 |
| Auth users | 10 000 | < 20 |

Запас огромный, на upgrade плана пойдём только если подключим >50 пользователей.
