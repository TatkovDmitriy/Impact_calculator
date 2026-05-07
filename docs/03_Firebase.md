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
| Plan | Spark (бесплатный) |

## Как создать проект (5 минут)

1. Открыть https://console.firebase.google.com → **Add project**
2. Name: `impact-calc-lp` → Continue
3. Google Analytics: отключить → **Create project**
4. **Add web app** (значок `</>`) → App nickname: `impact-calc-web` → Register
5. Скопировать firebaseConfig → вставить в `.env.local`
6. **Authentication → Get started → Email/Password → Enable → Save**
7. **Authentication → Users → Add user** → добавить разрешённые email'ы
8. **Firestore Database → Create database → Start in production mode → Region: europe-west3**
9. Применить Security Rules из раздела ниже
10. В Firestore создать документ: `config/access` → поле `emails: ["dmitriy.tatkov@lemanapro.ru"]`

⚠️ **Поле называется `emails`, не `allowedEmails`** — путаница в названии ломает whitelist-проверку.

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

    // Whitelist: поле emails (не allowedEmails!)
    function isAllowed() {
      return request.auth != null
        && request.auth.token.email in
           get(/databases/$(database)/documents/config/access).data.emails;
    }

    function isOwner(uid) {
      return request.auth != null && request.auth.uid == uid;
    }

    match /config/access {
      allow read: if request.auth != null;
      allow write: if false;  // только через консоль
    }

    match /metrics_cache/{snapshotDate} {
      allow read: if isAllowed();
      allow write: if isAllowed();
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
  }
}
```

## Service Account (Admin SDK + Google Sheets)

**Создан:** 2026-05-07
**Email:** `firebase-adminsdk-fbsvc@impact-calc-lp.iam.gserviceaccount.com`
**Key ID:** `8451939c153ce1f991258df56b18a8e89706a851`
**Используется для:** Firebase Admin SDK (API routes) + Google Sheets API (тот же SA)
**Приватный ключ:** только в `.env.local` (НЕ в репозитории)

⚠️ Таблицу Google Sheets нужно расшарить на этот email с доступом **Viewer**.

## Переменные окружения (`.env.local` — НЕ коммитить)

```env
# Firebase Web SDK (публичные — попадают в бандл)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBPTvSq3BXllK-aNUBM6FGJUoOhuTmxbvA
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=impact-calc-lp.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=impact-calc-lp
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=impact-calc-lp.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=33131969665
NEXT_PUBLIC_FIREBASE_APP_ID=1:33131969665:web:1b9b36c537ce2174966180

# Firebase Admin SDK (только сервер — API routes)
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@impact-calc-lp.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Google Sheets — тот же Service Account
GOOGLE_SHEETS_CLIENT_EMAIL=firebase-adminsdk-fbsvc@impact-calc-lp.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_SPREADSHEET_ID=103C2StHfJg9LPr9QFB4xmwkqLc_6pPoZT7_CKo3DuwE
```

## Firestore: начальные данные (seed)

```
config/access
  emails: [
    "dmitriy.tatkov@lemanapro.ru",
    // добавлять по мере подключения коллег
  ]
```

## Авторизованные домены Firebase

Firebase Console → Authentication → Settings → Authorized domains:
- `impact-calc-lp.firebaseapp.com` (по умолчанию)
- `impact-calculator-beryl.vercel.app` ✅ добавлен

Без этого Firebase Auth выбрасывает `auth/unauthorized-domain`.

## Лимиты Spark

| Ресурс | Лимит | Прогноз расхода |
|---|---|---|
| Firestore reads/day | 50 000 | < 5 000 (1–10 пользователей) |
| Firestore writes/day | 20 000 | < 1 000 |
| Auth users | 10 000 | < 20 |

Запас огромный, upgrade нужен только при >50 пользователях.
