# Bootstrap — Личный ПК (web-разработка)

> Цель: воспроизводимая настройка среды разработки для Next.js-части проекта.
> Время: ~30 минут (включая npm install).
> Можно запускать повторно — все шаги идемпотентны.

---

## Предварительные требования

Проверить наличие каждого инструмента. Если нет — установить по ссылке.

```powershell
node --version        # ожидать: v20.x.x или выше
npm --version         # ожидать: 10.x.x или выше
git --version         # ожидать: 2.40.x или выше
gh --version          # ожидать: gh version 2.x.x (https://cli.github.com)
vercel --version      # ожидать: Vercel CLI x.x.x
```

Если `vercel` не установлен:
```powershell
npm install -g vercel
```

---

## Шаг 1 — Клонировать репозиторий

```powershell
cd "d:\claude code\vs code"
git clone https://github.com/TatkovDmitriy/Impact_calculator.git "My Project\impact_calculator"
cd "My Project\impact_calculator"
```

Если директория уже существует (переустановка):
```powershell
cd "d:\claude code\vs code\My Project\impact_calculator"
git pull origin main
```

**Ожидание:** `git log --oneline -1` показывает последний коммит.

---

## Шаг 2 — Установить зависимости

```powershell
npm install
```

**Ожидание:** завершение без ошибок, `node_modules/` создана.
> Предупреждения (warnings) — допустимы; ошибки (npm ERR!) — нет.

---

## Шаг 3 — Настроить переменные окружения

Скопировать пример:
```powershell
Copy-Item .env.example .env.local
```

Открыть `.env.local` в редакторе и заполнить пустые значения из [docs/03_Firebase.md](../../docs/03_Firebase.md):

| Переменная | Где взять |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Console → Project Settings → Your apps |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | то же |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Ключ из `.json` файла service account (строка с `\n`) |
| `GOOGLE_SHEETS_PRIVATE_KEY` | Тот же ключ, что и FIREBASE_ADMIN_PRIVATE_KEY |

Остальные значения уже предзаполнены в `.env.example` (project ID, emails — они не секретные).

**Ожидание:** `.env.local` содержит 11 непустых переменных.

---

## Шаг 4 — Активировать pre-commit hook

```powershell
git config core.hooksPath ops/hooks
```

Проверить:
```powershell
git config core.hooksPath
# ожидать: ops/hooks
```

> Hook блокирует: `.env.local`, `*.key`, `*firebase-admin*.json`, файлы >5MB.
> Это однократная настройка — хранится в `.git/config`.

---

## Шаг 5 — Запустить dev server

```powershell
npm run dev
```

**Ожидание:** консоль показывает `Ready in X.Xs` и `http://localhost:3000`.

---

## Шаг 6 — Smoke test

Открыть в браузере `http://localhost:3000`:

- [ ] Страница `/login` открывается (фон `#2F3738`, кнопка жёлтая `#FDC300`)
- [ ] Логин с `dmtat924@gmail.com` → редирект на `/dashboard`
- [ ] `/dev-check` открывается, оба чека зелёные (Firebase Auth + Baseline API)
- [ ] F12 Console — нет ошибок типа `Uncaught` / `Error`

---

## Ежедневный ритуал

```powershell
cd "d:\claude code\vs code\My Project\impact_calculator"
git pull origin main
npm run dev
```

---

## Полезные команды

```powershell
npm run build          # проверить что сборка проходит (обязательно перед push)
npx vitest run         # юнит-тесты формул
npm run test:e2e       # e2e тесты против production URL (берёт BASE_URL из .env.test)
vercel env pull        # синхронизировать env vars из Vercel в .env.local
```

---

## Troubleshooting

**`npm install` завершается с ошибкой ERESOLVE:**
```powershell
npm install --legacy-peer-deps
```

**`npm run dev` падает на import error firebase-admin:**
Проверить `next.config.ts` — должен содержать:
```typescript
serverExternalPackages: ['firebase-admin', '@google-cloud/firestore']
```

**Git push заблокирован pre-commit hook:**
Проверить, что не добавлен `.env.local` или секретный файл:
```powershell
git diff --cached --name-only
```
