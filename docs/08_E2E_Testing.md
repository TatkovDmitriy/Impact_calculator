# 08 — E2E Тестирование (Playwright)

## Статус покрытия (2026-05-07)

| Калькулятор | Unit (Vitest) | E2E (Playwright) | Desktop | Mobile |
|---|---|---|---|---|
| C-09 Новосел | 14/14 ✅ | 34/34 ✅ | 17/17 ✅ | 17/17 ✅ |

---

## Стек и зависимости

| Инструмент | Версия | Назначение |
|---|---|---|
| Playwright | v1.59.1 | E2E тест-раннер |
| dotenv-cli | — | Загрузка `.env.test` в `npm run test:e2e` |
| `@playwright/test` | — | `test`, `expect`, `devices` |

---

## Запуск

```bash
# Из папки impact_calculator/
npm run test:e2e
```

Команда в `package.json`:
```json
"test:e2e": "dotenv -e .env.test -- playwright test"
```

### Файл `.env.test`

```
BASE_URL=https://impact-calculator-beryl.vercel.app
TEST_EMAIL=dmitriy.tatkov@lemanapro.ru
TEST_PASSWORD=123456
```

> `.env.test` в `.gitignore`. Шаблон без секретов — `.env.test.example`.

---

## ⚠️ Критично: только production URL

**Никогда не запускать против preview deployments.**

Vercel Deployment Protection блокирует все preview URL (`*.vercel.app` кроме production alias). Playwright получает страницу `vercel.com/login` вместо приложения — все тесты падают с таймаутом 40s.

| URL | Тип | Подходит для E2E |
|---|---|---|
| `impact-calculator-beryl.vercel.app` | Production alias | ✅ |
| `impact-calculator-<hash>.vercel.app` | Preview deployment | ❌ Vercel Protection |

Production alias `beryl` автоматически перенацеливается на последний деплой из `main`.

---

## Конфигурация (`playwright.config.ts`)

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,   // последовательно — тесты зависят от аутентификации на проде
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  timeout: 40_000,        // production latency + анимации
  reporter: [
    ['list'],
    ['html', { outputFolder: 'tests/e2e/report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? 'https://impact-calculator-beryl.vercel.app',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'ru-RU',
  },
  projects: [
    { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'Mobile 375px',
      use: {
        viewport: { width: 375, height: 812 },
        userAgent: devices['iPhone 13'].userAgent,
      },
    },
  ],
});
```

---

## Структура файлов

```
impact_calculator/
├── playwright.config.ts
├── .env.test                    # gitignore — секреты
├── .env.test.example            # шаблон без секретов
└── tests/
    └── e2e/
        ├── novosel.spec.ts      # 17 тестов C-09
        ├── helpers/
        │   └── login.ts         # loginAs, setSliderToMin/Max, nudgeSlider
        └── report/              # HTML отчёт (gitignore)
```

---

## Хелперы (`tests/e2e/helpers/login.ts`)

### `loginAs(page, email, password)`

Переходит на `/login`, заполняет форму, кликает Submit, ждёт `**/dashboard`.

```typescript
export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}
```

### Radix UI Slider хелперы

Radix Slider не использует `input[type=range]` — только keyboard events на `[role=slider]`.

```typescript
// Поиск thumb по label (структура: label span → ../../ → slider)
function sliderThumb(page, label) {
  return page.getByText(label, { exact: true }).locator('../..').getByRole('slider');
}

setSliderToMin(page, 'Маржа проекта')      // press Home
setSliderToMax(page, 'Целевая доля Новоселов')  // press End
nudgeSlider(page, 'Маржа проекта', +5)    // 5× ArrowRight
nudgeSlider(page, 'Маржа проекта', -3)    // 3× ArrowLeft
```

---

## Тест-план C-09 Новосел

### Golden Path (K1–K9)

| ID | Название | Ключевой assert |
|---|---|---|
| K1 | Страница рендерится, Таб А активен, KPI-карточки видны | heading "Новосел — Программа лояльности", "Δ Выручка", "ROI дисконта" |
| K2 | Пресет Оптимистичный → доля 25% | `aria-valuenow="25"` на слайдере |
| K3 | Слайдер доли → 50%, KPI обновляется | `aria-valuenow="50"` + карточки видны после 400ms |
| K4 | Storage + margin min + share max + Нет инкрементальности → roi_negative | текст "ROI < 1 — программа убыточна" |
| K5 | Ванная → cap_hit баннер | текст "Дисконт достиг капа" |
| K6 | Таб Б → карточки ROI, badge "Лучший ROI" у Ванной | "Лучший ROI" visible; Bathroom ROI ≈ 2.39× > Kitchen 2.0× |
| K7 | Таб В → benchmark данные | `AOV` или `Конверс` или `Доля` в content |
| K8 | Кнопка "Сохранить сценарий" → Radix Dialog открывается | `getByRole('dialog')` visible |
| K9 | Каталог `/calculators` → карточка Новосел кликабельна → переход | URL `/calculators/novosel` |

### Edge Cases (E2–E7)

| ID | Название | Ключевой assert |
|---|---|---|
| E2 | Kitchen + incrementality=none → Δ Выручка отрицательная | карточка содержит `[−-]\d` |
| E3 | Storage дефолт + Базовый пресет + Полная → нет warnings | "Дисконт достиг капа" not visible; "ROI < 1" not visible |
| E4 | Доля = 5% (min) → страница не падает | `aria-valuenow="5"`, KPI visible |
| E5 | Доля = 50% (max) → страница не падает | `aria-valuenow="50"`, KPI visible |
| E6 | Быстрые клики слайдером (5×) → нет краша | KPI visible после 500ms |
| E7 | Mobile layout → ключевые элементы видны | heading + tabs + KPI карточки |

### Security (S1–S2)

| ID | Название | Ключевой assert |
|---|---|---|
| S1 | `GET /api/baseline` без cookie `auth_uid` → 401 | `res.status() === 401` |
| S2 | `GET /calculators/novosel` без auth → редирект /login | URL совпадает `/login` |

---

## Арифметические контрольные кейсы (APR 2026 baseline)

Использовались для написания тестов K4 и K6. **Проверялись независимо от DEV.**

### Discount model (cap логика)

```
DISCOUNT_CAPS = { kitchen: 40_000, bathroom: 10_000, storage: 10_000 }
discountPerProject(category, aov) = min(aov × 0.10, cap)

Kitchen:  min(166 299 × 0.10, 40 000) = 16 630 ₽   — кэп НЕ достигается
Bathroom: min(119 374 × 0.10, 10 000) = 10 000 ₽   — КЭП ДОСТИГАЕТСЯ → cap_hit
Storage:  min(74 180 × 0.10, 10 000)  = 7 418 ₽    — кэп НЕ достигается
```

### Warning приоритет (cap_hit проверяется ПЕРВЫМ)

```
capHit = categories.some(c => baseline[c].novoselAov × 0.10 > cap[c])
if capHit → warning = 'cap_hit'        ← ПЕРВЫЙ
else if roiDiscount < 1 → warning = 'roi_negative'

Следствие для тестов:
- Bathroom → cap_hit всегда (11 937 > 10 000). roi_negative недостижим для Bathroom.
- roi_negative реально достигается: Storage + targetShare=50% + marginPct=5% + incrementality=none
```

### ROI по категориям (margin=20%, baseline APR 2026)

```
grossMargin = novoselAov × marginPct
ROI = grossMargin / discountCost

Kitchen:  33 260 / 16 630 ≈ 2.0×
Bathroom: 23 875 / 10 000 ≈ 2.39×   ← bestByRoi (badge "Лучший ROI")
Storage:  14 836 / 7 418  ≈ 2.0×
```

---

## QA-уроки (Phase 3)

| Урок | Что произошло |
|---|---|
| Проверять арифметику DEV до написания тестов | BUG-01: DEV-handoff неправильно указал Bathroom→roi_negative. В коде ошибки не было — ошибка в handoff документе |
| Проверять направление сравнений | BUG-02: DEV написал "Kitchen лучший ROI" — на самом деле Bathroom 2.39× > Kitchen 2.0× |
| Preview URL = Vercel login page для Playwright | Все тесты падают с timeout, если BASE_URL = preview hash. Использовать только `beryl` |
| proxy.ts default export на Vercel | S2 обнаружил: `/calculators/novosel` открывалось без auth. Причина: named export в proxy.ts. Исправлено на `export default` |

---

## Добавление тестов для нового калькулятора

При создании нового калькулятора (slug: `revenue-uplift`) создать:
```
tests/e2e/revenue-uplift.spec.ts
```

Структура теста:
1. `beforeEach` → `loginAs` + `page.goto('/calculators/revenue-uplift')`
2. K1: страница рендерится, KPI видны
3. K2–K5: golden path под разные inputs
4. E2–E5: edge cases (min/max, нулевые значения, большие числа)
5. S1: защищённый API эндпоинт → 401 без cookie
6. S2: страница калькулятора без auth → редирект /login

Правило: **сначала пересчитай ожидаемые значения вручную**, затем пиши ассерты.
