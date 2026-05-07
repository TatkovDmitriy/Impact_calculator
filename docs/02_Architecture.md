# 02 — Архитектура и стек

## Стек

| Слой | Технология | Зачем |
|---|---|---|
| Framework | Next.js 16.2.5 (App Router) | SSR + serverless API routes на одном проекте |
| Язык | TypeScript (strict) | Type-safety для финансовых формул — критично |
| Стили | Tailwind CSS v4 — конфиг через `@theme inline` в globals.css, файла tailwind.config.ts нет | Скорость + кастом-тема ЛП |
| UI-компоненты | Radix UI примитивы (НЕ shadcn/ui — не является npm-пакетом) | Готовые primitives (Dialog, Table, Form), кастомизируемые под бренд |
| Графики (стандарт) | Recharts | Простые line/bar/area — быстро |
| Графики (сложные) | ECharts (echarts-for-react) | Sankey, treemap, heatmap, candlestick |
| Анимации | Framer Motion | Анимация чисел, появление графиков, transitions |
| Таблицы | TanStack Table | Сложные таблицы со сортировкой/группировкой |
| Auth | Firebase Auth (Email/Password) | Whitelist приглашённых пользователей |
| DB | Firestore | Сценарии, кеш Sheets-метрик, whitelist доступа |
| Source of Truth (метрики) | Google Sheets API v4 | Через Service Account |
| Хостинг | Vercel | Free tier, авто-деплой из main (Root Directory: impact_calculator) |
| Шрифт | Manrope (fallback для LM Main) | Соответствие гайдлайнам ЛП |

## Структура проекта

```
impact_calculator/
├── app/                          # Next.js App Router
│   ├── (auth)/login/             # страница логина + LoginForm.tsx
│   ├── (app)/
│   │   ├── layout.tsx            # AuthProvider обёртка
│   │   ├── dashboard/            # главный дашборд
│   │   ├── calculators/
│   │   │   ├── page.tsx          # каталог
│   │   │   └── [slug]/page.tsx   # конкретный калькулятор
│   │   ├── scenarios/            # сохранённые сценарии
│   │   └── dev-check/            # health-check (скрыт в production)
│   ├── api/
│   │   ├── session/route.ts      # POST/DELETE httpOnly session cookie
│   │   ├── baseline/route.ts     # GET метрик (hardcoded Apr 2026 → Phase 3: Sheets)
│   │   └── scenarios/            # CRUD сценариев (Phase 4+)
│   ├── layout.tsx
│   └── globals.css               # бренд-токены ЛП (@theme inline, Tailwind v4)
├── components/
│   ├── ui/                       # Radix UI примитивы
│   ├── charts/                   # обёртки над Recharts/ECharts
│   ├── calculators/              # конкретные калькуляторы
│   └── brand/                    # логотип, иконки ЛП
├── contexts/
│   └── AuthContext.tsx           # Firebase onAuthStateChanged + redirect
├── lib/
│   ├── firebase/
│   │   ├── client.ts             # Firebase Web SDK init (auth, db)
│   │   ├── admin.ts              # Firebase Admin SDK (серверный)
│   │   └── auth.ts               # signIn, signOut, onAuthChange ('use client')
│   ├── sheets/
│   │   └── client.ts             # Google Sheets API клиент
│   ├── calculators/              # бизнес-логика расчётов (pure functions)
│   │   └── novosel/              # C-09: novosel-loyalty-impact
│   └── utils.ts
├── proxy.ts                      # Next.js 16 Proxy (бывший middleware) — auth guard
├── public/
│   ├── lemana-pro-logo.png
│   └── favicon.ico
├── docs/                         # эта документация
├── agents/                       # промпты команды
└── backlog/
```

## Архитектура аутентификации (двухслойная)

```
Клиент                      Сервер
──────                      ──────
Firebase signIn()
  → getIdToken()
  → POST /api/session ──→ Admin SDK verifyIdToken()
                           → Firestore config/access.emails проверка
                           → set httpOnly cookie auth_uid (7 дней)
                        ←─ 200 ok / 403 access_denied

proxy.ts ────────────────→ cookie auth_uid присутствует?
(каждый защищённый запрос)  нет → redirect /login?from=...
                            да  → NextResponse.next()

AuthProvider (React) ────→ onAuthStateChanged
                            нет user → router.replace('/login')
```

**Важно для Next.js 16:** файл называется `proxy.ts` (не `middleware.ts`), экспортируемая функция — `proxy`. Это Breaking Change в Next.js 16 — не переименовывать.

## Модель данных (Firestore)

```
config/access
  emails: string[]              # whitelist (ПОЛЕ НАЗЫВАЕТСЯ emails, НЕ allowedEmails)

metrics_cache/{YYYY-MM-DD}
  source: 'hardcoded' | 'google-sheets' | 'cache' | 'fallback'
  baseline: NovoselBaseline     # структура из lib/calculators/novosel/types.ts
  fetchedAt: string             # ISO timestamp

users/{uid}
  email: string
  displayName: string
  role: 'admin' | 'member'
  createdAt: timestamp

scenarioSets/{setId}
  ownerId: uid
  calculatorSlug: string
  name: string
  scenarioIds: string[]
  createdAt, updatedAt: timestamp

scenarios/{scenarioId}
  ownerId: uid
  setId: string | null
  calculatorSlug: string
  label: string
  name: string
  inputs: object
  baselineSnapshot: object      # снэпшот метрик на момент сохранения
  result: object                # кеш результата для быстрого сравнения
  color: string
  createdAt, updatedAt: timestamp
```

## Ключевые архитектурные решения

1. **Расчёты — pure functions в `lib/calculators/`.** Никакого React, никакого Firebase. Тестируются юнит-тестами без моков, переиспользуются на сервере и клиенте.

2. **Sheets-метрики кешируются в Firestore.** Первый запрос дня — fetch из Google Sheets API, snapshot в `metrics_cache/{date}`. Остальные — из кеша. Force refresh: `GET /api/baseline?refresh=1`.

3. **Сценарий хранит снэпшот baseline.** При сохранении записываем `baselineSnapshot` — иначе при изменении Sheets старые расчёты поплывут. `result` кешируем для быстрой отрисовки без пересчёта.

4. **Калькулятор = плагин.** Объект с метаданными: slug, title, description, Zod-схема inputs, formula function, chart spec. Регистрация через `lib/calculators/registry.ts` — без изменений роутинга.

5. **Сценарное моделирование — платформенный стандарт.** Каждый калькулятор обязан поддерживать:
   - **Live preview:** изменение input → пересчёт (debounce 300ms)
   - **Сохранение сценария** с label (A / B / C)
   - **Scenario Set:** 2–4 сценария одного калькулятора для сравнения
   - **Сравнительный дашборд:** overlay линий, side-by-side таблица delta

6. **Whitelist по email.** Сервер (`/api/session`) проверяет email через Firestore `config/access` поле `emails`. Firestore Security Rules дублируют проверку на уровне БД.

## Бренд-токены (Tailwind v4, globals.css)

```css
/* Задаются в :root, подключаются через @theme inline */
:root {
  --lp-dark: #2F3738;       /* primary text, headers */
  --lp-yellow: #FDC300;     /* accent, CTA, charts highlight */
  --lp-danger: #B84A4A;     /* ошибки */
  --lp-bg: #FFFFFF;
  --lp-muted: #F5F5F5;
  --lp-border: #E5E5E5;
  --lp-text-muted: #6B7280;
  --chart-1: #FDC300;       /* БЕЗ зелёного — гайдлайн ЛП */
  --chart-2: #2F3738;
}
```

Файла `tailwind.config.ts` нет — в Tailwind v4 конфиг только через CSS `@theme inline`.
