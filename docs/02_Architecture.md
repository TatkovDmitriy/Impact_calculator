# 02 — Архитектура и стек

## Стек

| Слой | Технология | Версия | Зачем |
|---|---|---|---|
| Framework | Next.js (App Router) | **16.2.5** | SSR + serverless API routes на одном проекте |
| Язык | TypeScript (strict) | — | Type-safety для финансовых формул — критично |
| Стили | Tailwind CSS v4 | v4 | Скорость + кастом-тема ЛП |
| UI-компоненты | Radix UI примитивы | — | Dialog, Slider, Tabs, Tooltip — кастомизируемые под бренд |
| Графики | Recharts | v3 | line/bar/area — простые, lightweight |
| Графики (сложные) | ECharts (echarts-for-react) | — | Sankey, waterfall, radar, heatmap |
| Анимации | Framer Motion | — | Transitions, анимированные появления |
| Счётчики | `AnimatedNumber` (RAF custom) | — | easeOutCubic 400ms, requestAnimationFrame |
| Auth | Firebase Auth | Web SDK v12 | Email/Password + whitelist по Firestore |
| DB | Firestore | — | Сценарии, кеш Sheets-метрик, whitelist |
| Source of Truth | Google Sheets API v4 | — | Через Service Account |
| Хостинг | Vercel | — | Авто-деплой из main, Root Directory: impact_calculator |
| Тесты (unit) | Vitest | v4 | Pure functions формул — без моков |
| Тесты (e2e) | Playwright | v1.59.1 | Браузерное тестирование Desktop + Mobile |
| Шрифт | Manrope (next/font/google) | — | Fallback для LM Main, соответствие гайдлайнам |

## Структура проекта

```
impact_calculator/
├── app/
│   ├── layout.tsx                        # Root layout: Manrope шрифт, metadata
│   ├── page.tsx                          # / → redirect /dashboard
│   ├── globals.css                       # Бренд-токены (@theme inline, Tailwind v4)
│   ├── (auth)/
│   │   └── login/
│   │       ├── page.tsx                  # Страница логина (no AuthProvider)
│   │       └── LoginForm.tsx             # react-hook-form + zod + Firebase signIn
│   ├── (app)/
│   │   ├── layout.tsx                    # AuthProvider обёртка (onAuthStateChanged)
│   │   ├── dashboard/page.tsx            # Главный дашборд
│   │   ├── dev-check/page.tsx            # Health check (Firebase + Baseline API)
│   │   ├── scenarios/page.tsx            # Сохранённые сценарии
│   │   └── calculators/
│   │       ├── page.tsx                  # Каталог калькуляторов
│   │       ├── [slug]/page.tsx           # Заглушка для незарегистрированных slugs
│   │       └── novosel/                  # СТАТИЧНЫЙ роут — перекрывает [slug]
│   │           ├── page.tsx              # Главная страница калькулятора C-09
│   │           ├── ScenarioAPanel.tsx    # КПИ, warnings, BarChart, sensitivity LineChart
│   │           ├── ScenarioBPanel.tsx    # Категории: карточки ROI, BarChart, таблица
│   │           ├── ScenarioCPanel.tsx    # Premium table, клиентские метрики, trend chart
│   │           ├── AnimatedNumber.tsx    # RAF easeOutCubic counter animation
│   │           └── SaveModal.tsx         # Radix Dialog → save в Firestore
│   └── api/
│       ├── session/route.ts              # POST: Firebase verifyIdToken → httpOnly cookie
│       └── baseline/route.ts             # GET: hardcoded APR 2026 baseline (auth-protected)
├── components/
│   ├── brand/Logo.tsx                    # Логотип ЛП
│   └── layout/
│       ├── Navbar.tsx
│       └── Sidebar.tsx
├── contexts/
│   └── AuthContext.tsx                   # onAuthStateChanged + redirect guard
├── lib/
│   ├── firebase/
│   │   ├── client.ts                     # Firebase Web SDK init (auth, db)
│   │   ├── admin.ts                      # Firebase Admin SDK (только серверный)
│   │   └── auth.ts                       # signIn, signOut, onAuthChange ('use client')
│   ├── calculators/
│   │   ├── types.ts                      # CalculatorPlugin, ScenarioPreset, Category
│   │   └── novosel/                      # C-09: Новосел
│   │       ├── types.ts                  # NovoselInputs, ScenarioAResult, ScenarioBResult, ScenarioCResult
│   │       ├── formulas.ts               # computeScenarioA/B/C — pure functions
│   │       ├── formulas.test.ts          # 14 unit тестов (Vitest)
│   │       ├── baseline.ts               # NOVOSEL_BASELINE — hardcoded APR 2026
│   │       └── presets.ts                # NOVOSEL_PRESETS [Базовый, Оптимистичный, Консервативный]
│   └── utils.ts                          # cn() и прочее
├── proxy.ts                              # ⚠️ Next.js 16 Proxy (НЕ middleware.ts) — auth guard
├── next.config.ts                        # serverExternalPackages: ['firebase-admin', ...]
├── tests/
│   └── e2e/
│       ├── novosel.spec.ts               # 17 тестов: K1–K9, E2–E7, S1–S2
│       ├── helpers/login.ts              # loginAs, setSliderToMin/Max, nudgeSlider
│       └── report/                       # HTML отчёт (gitignore)
├── playwright.config.ts                  # Desktop Chrome + Mobile 375px
├── .env.test                             # BASE_URL, TEST_EMAIL, TEST_PASSWORD (gitignore)
├── .env.test.example                     # Шаблон без секретов
├── docs/                                 # Эта документация
├── agents/                               # Промпты команды AI-агентов
└── backlog/
```

## ⚠️ Критические отличия Next.js 16 от 15

### 1. proxy.ts вместо middleware.ts

В Next.js 16 middleware переименован в Proxy:
- **Файл:** `proxy.ts` (в корне `impact_calculator/`, рядом с `app/`)
- **Экспорт:** `export default function proxy(request: NextRequest)` — **обязательно default export**
- Именованный экспорт `export function proxy` работает в локальном Next.js 16, но **не подхватывается Vercel Edge Runtime**

```typescript
// proxy.ts — ПРАВИЛЬНО
export default function proxy(request: NextRequest) { ... }
export const config = { matcher: [...] };
```

Документация: `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`

### 2. serverExternalPackages в next.config.ts

```typescript
const nextConfig = {
  serverExternalPackages: ['firebase-admin', '@google-cloud/firestore'],
};
```

Без этого `firebase-admin` не работает с Turbopack (ошибка при build).

### 3. Статичный роут перекрывает динамический

`app/(app)/calculators/novosel/page.tsx` (статичный) имеет приоритет над `app/(app)/calculators/[slug]/page.tsx` (динамичный) для URL `/calculators/novosel`. Это стандартное поведение Next.js App Router — не баг.

## Архитектура аутентификации (двухслойная)

```
Клиент                           Edge (proxy.ts)       Сервер (API Route)
──────                           ───────────────       ──────────────────

1. Firebase signIn(email, pwd)
   → getIdToken()
   → POST /api/session ─────────────────────────────→ Admin SDK verifyIdToken(idToken)
                                                        → Firestore config/access.emails
                                                        → set httpOnly cookie auth_uid (7 дней)
                                                       ←─ 200 / 403 access_denied

2. Каждый запрос к защищённому роуту:
   request ──────────────────────→ proxy.ts:
                                    cookie auth_uid присутствует?
                                    нет → redirect /login?from=<path>
                                    да  → NextResponse.next()

3. AuthProvider (React, client):
   onAuthStateChanged(callback)
   no firebaseUser → router.replace('/login')   ← второй слой защиты (client-side)
```

**Защищённые роуты** (matcher в proxy.ts):
- `/dashboard/:path*`
- `/calculators/:path*`
- `/scenarios/:path*`
- `/dev-check/:path*`

**Незащищённые:**
- `/login` — форма входа
- `/api/session` — принимает токен Firebase и выдаёт cookie
- `/api/baseline` — защищён отдельной cookie-проверкой внутри handler

### Почему два слоя?

- `proxy.ts` (Edge): быстро, но проверяет только наличие cookie (не Firebase auth state). Предотвращает рендер защищённых страниц без авторизации.
- `AuthProvider` (React): точно знает Firebase auth state. Страховка на случай если cookie устарел или отозван.

## Модель данных (Firestore)

```
config/access
  emails: string[]              # whitelist (ПОЛЕ НАЗЫВАЕТСЯ emails, НЕ allowedEmails)
                                 # тип: array — обязательно, не string

metrics_cache/{YYYY-MM-DD}
  source: 'hardcoded' | 'google-sheets' | 'cache' | 'fallback'
  baseline: NovoselBaseline
  fetchedAt: string             # ISO timestamp

users/{uid}
  email: string
  displayName: string
  role: 'admin' | 'member'
  createdAt: timestamp

scenarios/{scenarioId}
  ownerId: uid
  calculatorSlug: string        # 'novosel'
  label: string                 # имя сценария
  color: string                 # hex цвет для дашборда
  inputs: NovoselInputs
  result: ScenarioAResult       # кеш результата
  baselineSnapshot: NovoselBaseline  # снэпшот данных на момент сохранения
  createdAt: timestamp
```

## Архитектура калькулятора C-09

### Слои расчёта

```
UI (page.tsx)
  │ inputs: NovoselInputs
  ↓ debounce 300ms
formulas.ts                    ← pure functions, нет React/Firebase
  computeScenarioA(inputs, baseline) → ScenarioAResult
  computeScenarioB(inputs, baseline) → ScenarioBResult
  computeScenarioC(baseline)         → ScenarioCResult
  │
  ↑ baseline: NovoselBaseline   ← hardcoded APR 2026 (NOVOSEL_BASELINE)
                                   Phase 4: заменить на /api/baseline
```

### Discount model (формула кэпа)

```
DISCOUNT_CAPS = { kitchen: 40_000, bathroom: 10_000, storage: 10_000 }
discountPerProject(category, aov) = min(aov × 0.10, DISCOUNT_CAPS[category])

APR 2026 результат:
  Kitchen:  min(166 299 × 0.10, 40 000) = 16 630 ₽  (кэп НЕ достигается)
  Bathroom: min(119 374 × 0.10, 10 000) = 10 000 ₽  (КЭП ДОСТИГАЕТСЯ → warning cap_hit)
  Storage:  min(74 180 × 0.10, 10 000)  = 7 418 ₽   (кэп НЕ достигается)
```

### Warning логика (ScenarioA)

```
capHit = categories.some(c => baseline[c].novoselAov × 0.10 > DISCOUNT_CAPS[c])

if capHit → warning = 'cap_hit'        ← приоритет (проверяется ПЕРВЫМ)
else if roiDiscount < 1 → warning = 'roi_negative'

roi_negative НЕ достигается для Bathroom никогда — cap_hit перехватывает первым.
roi_negative достигается для Storage при: targetShare≥0.50, marginPct≤0.05, incrementality='none'
```

### ROI по категориям (Сценарий Б, baseline APR 2026, margin=20%)

```
Kitchen:  grossMargin/discountCost = 33 260 / 16 630 ≈ 2.0×
Bathroom: grossMargin/discountCost = 23 875 / 10 000 ≈ 2.39×  ← bestByRoi
Storage:  grossMargin/discountCost = 14 836 / 7 418  ≈ 2.0×
```

## Recharts v3 — критические особенности

В Recharts v3 типизация Tooltip `formatter` изменилась:

```typescript
// НЕПРАВИЛЬНО (TypeScript error в build):
<Tooltip formatter={(v: number) => [v.toLocaleString() + ' ₽']} />

// ПРАВИЛЬНО:
<Tooltip formatter={(v) => [Number(v).toLocaleString() + ' ₽']} />
```

Для per-bar цветов в `<Bar>` использовать `<Cell>`, не `<rect>`:

```typescript
import { Bar, Cell } from 'recharts';

<Bar dataKey="value">
  {data.map((entry, i) => (
    <Cell key={i} fill={entry.fill} />   // ✅ Cell
  ))}
</Bar>
```

## Бренд-токены (Tailwind v4, globals.css)

```css
/* globals.css — @theme inline */
:root {
  --lp-dark: #2F3738;         /* primary text, headers, кнопки */
  --lp-yellow: #FDC300;       /* accent, CTA, slider, charts highlight */
  --lp-danger: #B84A4A;       /* ошибки, отрицательные delta */
  --lp-bg: #FFFFFF;
  --lp-muted: #F5F5F5;        /* фон панелей, tablist */
  --lp-border: #E5E5E5;       /* разделители, card borders */
  --lp-text-muted: #6B7280;   /* secondary text, labels */
}
```

⚠️ **Файла `tailwind.config.ts` нет** — в Tailwind v4 конфиг только через CSS `@theme inline`. Не создавать.

⚠️ **Без зелёного** — гайдлайн ЛП. chart-1 = yellow (#FDC300), chart-2 = dark (#2F3738).

## Ключевые архитектурные решения

1. **Расчёты — pure functions.** `lib/calculators/novosel/formulas.ts` — нет React, нет Firebase. Тестируются Vitest без моков. Переиспользуются на клиенте и сервере.

2. **Статичный роут для калькулятора.** `app/(app)/calculators/novosel/` — статичная папка, не `[slug]`. Позволяет иметь co-located компоненты (ScenarioAPanel, SaveModal и т.д.) без лишней индиректности.

3. **Debounce 300ms через useRef.** Слайдеры изменяют `inputs` синхронно (UI отзывается сразу), расчёт откладывается на 300ms через `debounceRef.current = setTimeout(recalculate, 300)`.

4. **AnimatedNumber через RAF.** Не Framer Motion — встроенный `requestAnimationFrame` с easeOutCubic (400ms). Работает без дополнительных зависимостей, не блокирует интерактив.

5. **Сценарий хранит снэпшот baseline.** `baselineSnapshot` в Firestore — при изменении данных в Sheets старые расчёты не поплывут.

6. **E2E тесты только против production URL.** Preview deployments на Vercel защищены Vercel Deployment Protection — Playwright не может их открыть без Vercel-авторизации. Тесты запускать только против production alias (`beryl`).
