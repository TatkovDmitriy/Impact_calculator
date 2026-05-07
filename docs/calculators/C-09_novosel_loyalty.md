# C-09 — Новосел: бизнес-моделирование программы лояльности

> **Slug:** `novosel-loyalty-impact`
> **Статус:** ПЕРВЫЙ К РАЗРАБОТКЕ — P0
> **Версия спеки:** 1.0 (2026-05-07)

## Контекст программы

**Новосел** — программа лояльности Лемана Про для клиентов, купивших новостройку или вторичку в течение последнего года. Скидка до **85 000 руб.** на проект кухни, хранения или ванной комнаты.

Ключевой вопрос: **стоит ли дисконт той выручки и маржи, которую приносят Новоселы?**

---

## Baseline-данные из Google Sheets

Данные за дек 2025 — апр 2026 по трём категориям. Последний месяц (апр 2026) — основной baseline для расчётов.

### Апрель 2026 — Сделки (Созданные)

| Категория | Всего сделок | из них Новоселы | Доля Новоселов |
|---|---|---|---|
| Bathroom | 27 429 | 5 331 | **19.4%** |
| Kitchen | 35 736 | 4 179 | **11.7%** |
| Storage | 20 685 | 2 828 | **13.7%** |
| **Итого** | **83 850** | **12 338** | **14.7%** |

### Апрель 2026 — Метрики Новосел vs Не Новосел

| Категория | Сегмент | AOV (руб.) | Конверсия | Создано | Оплачено | Выручка (руб.) |
|---|---|---|---|---|---|---|
| Bathroom | Не Новосел | 92 096 | 43.7% | 22 098 | 9 653 | 889 006 952 |
| Bathroom | Новосел | 119 374 | 74.5% | 5 331 | 3 973 | 474 274 038 |
| Kitchen | Не Новосел | 113 174 | 18.2% | 31 557 | 5 739 | 649 503 861 |
| Kitchen | Новосел | 166 299 | 44.1% | 4 179 | 1 844 | 306 654 683 |
| Storage | Не Новосел | 44 538 | 28.5% | 17 857 | 5 087 | 226 562 436 |
| Storage | Новосел | 74 180 | 42.8% | 2 828 | 1 209 | 89 684 091 |

### Апрель 2026 — Проекты на клиента (все категории совокупно)

| Сегмент | Уникальных клиентов | Создано проектов | В ср. создано/кл | В ср. оплачено/кл |
|---|---|---|---|---|
| Не Новосел | 99 594 | 110 023 | 1.10 | 0.48 |
| Новосел | 13 102 | 16 329 | 1.25 | 0.75 |

### Динамика по всем месяцам (Bathroom, для понимания тренда)

| Месяц | Новосел AOV | Не Новосел AOV | Новосел Conv | Не Новосел Conv | Доля Новоселов |
|---|---|---|---|---|---|
| 2025-12 | 155 605 | 107 917 | 86.4% | 64.1% | 10.8% |
| 2026-01 | 154 365 | 106 195 | 85.1% | 57.5% | 11.5% |
| 2026-02 | 146 051 | 103 957 | 85.6% | 56.6% | 12.9% |
| 2026-03 | 128 586 | 98 060 | 84.4% | 51.9% | 18.3% |
| 2026-04 | 119 374 | 92 096 | 74.5% | 43.7% | 19.4% |

> ⚠️ Тренд: AOV и конверсия снижаются у обоих сегментов. У Новоселов конверсия упала с 86% (дек) до 74% (апр). Это важная переменная для сценариев.

### Ключевые наблюдения (PM-аналитика)

**AOV-premium Новоселов vs Не Новоселов (апр 2026):**
- Bathroom: +30% (119k vs 92k)
- Kitchen: +47% (166k vs 113k)
- Storage: +67% (74k vs 45k)

**Конверсия-премиум (апр 2026):**
- Bathroom: +30.8 пп (74.5% vs 43.7%)
- Kitchen: +25.9 пп (44.1% vs 18.2%)
- Storage: +14.3 пп (42.8% vs 28.5%)

**Выручка на 1 созданную сделку (апр 2026):**
- Bathroom: Новосел — 89k руб/сделку, Не Новосел — 40k → **в 2.2× больше**
- Kitchen: Новосел — 73k руб/сделку, Не Новосел — 21k → **в 3.5× больше**
- Storage: Новосел — 32k руб/сделку, Не Новосел — 13k → **в 2.5× больше**

---

## Inputs калькулятора

### Блок 1 — Параметры из Sheets (auto-pull, с кнопкой "Обновить")

| Параметр | Откуда | Тип |
|---|---|---|
| AOV Новосел по категории | Sheets — последний месяц | auto |
| AOV Не Новосел по категории | Sheets — последний месяц | auto |
| Конверсия Новосел по категории | Sheets | auto |
| Конверсия Не Новосел по категории | Sheets | auto |
| Создано сделок Всего по категории | Sheets | auto |
| Создано сделок Новосел по категории | Sheets | auto |
| Проектов/клиент — Новосел (1.25) | Sheets | auto |
| Проектов/клиент — Не Новосел (1.10) | Sheets | auto |

### Блок 2 — Параметры моделирования (вводит пользователь)

| Параметр | Дефолт | Диапазон | Тип |
|---|---|---|---|
| Маржа проекта (%) | 20% | 5–50% | slider |
| Дисконт на 1 оплаченный проект (руб.) | 85 000 | 0–150 000 | number |
| Горизонт расчёта (мес) | 12 | 1–36 | slider |
| Тип категории | Kitchen | Bathroom / Kitchen / Storage / Все | radio/select |
| Целевая доля Новоселов (сценарий) | 15% | 5–50% | slider |
| Рост общего потока сделок/мес (%) | 0% | -20–+50% | slider |
| Тип incrementality | Fully incremental | Fully incremental / Partially (50%) / Non-incremental | radio |

**Параметр "Тип incrementality"** — ключевое допущение: пришли ли Новоселы благодаря программе (полностью incremental), или пришли бы и без неё (тогда дисконт — чистый убыток).

---

## Сценарии (3 готовых режима)

### Сценарий А — «Что если доля Новоселов вырастет?»

**Вопрос:** как изменится выручка и маржа при росте доли Новоселов с текущей (14.7%) до целевой (например, 25%)?

**Логика:**
```
total_created = created_all (из Sheets)
novosel_created_new = total_created × target_share
non_novosel_created_new = total_created × (1 - target_share)

revenue_novosel = novosel_created_new × conv_novosel × aov_novosel
revenue_non_novosel = non_novosel_created_new × conv_non_novosel × aov_non_novosel
total_revenue = revenue_novosel + revenue_non_novosel

paid_novosel = novosel_created_new × conv_novosel
discount_cost = paid_novosel × discount_per_project

gross_margin = total_revenue × margin_pct
net_margin = gross_margin - discount_cost

# Delta vs baseline
delta_revenue = total_revenue - baseline_revenue
delta_net_margin = net_margin - baseline_net_margin
roi_program = (delta_net_margin / discount_cost) × 100  // ROI программы дисконта
```

**Визуализация:**
1. **Waterfall chart:** Baseline выручка → +incremental Новосел выручка → -стоимость дисконта → Net margin
2. **Slider sensitivity:** ось X = доля Новоселов 5–50%, ось Y = net margin — интерактивный
3. **Big numbers:** ΔВыручка, ΔNet margin, ROI дисконта, Стоимость программы

---

### Сценарий Б — «Какой проектный мир приносит больше?»

**Вопрос:** в какой категории Новосел приносит максимальный net margin с учётом дисконта?

**Логика:**
```
для каждой категории c in {Bathroom, Kitchen, Storage}:
  revenue_novosel_c = novosel_created_c × conv_novosel_c × aov_novosel_c
  paid_c = novosel_created_c × conv_novosel_c
  discount_cost_c = paid_c × discount_per_project
  gross_margin_c = revenue_novosel_c × margin_pct
  net_margin_c = gross_margin_c - discount_cost_c
  margin_per_deal_c = net_margin_c / novosel_created_c
  roi_discount_c = gross_margin_c / discount_cost_c   // > 1 = программа окупается
```

**Визуализация:**
1. **Grouped bar (3 группы = категории, 4 бара каждая):** Revenue, Gross Margin, Discount Cost, Net Margin
2. **Radar chart (5 осей):** AOV-индекс, Конверсия, Net margin/deal, ROI дисконта, Доля Новоселов — все нормированы
3. **Таблица сравнения** — сортируемая по любому показателю

---

### Сценарий В — «Новосел vs Не Новосел — насколько лучше?»

**Вопрос:** по каким метрикам Новоселы реально сильнее? Стоит ли их привлекать активнее?

**Логика (аналитическая, не моделирование):** берём реальные данные из Sheets, считаем premium-индексы.

```
для каждой категории c:
  aov_premium_c = (aov_novosel_c / aov_non_novosel_c - 1) × 100%
  conv_lift_pp_c = conv_novosel_c - conv_non_novosel_c
  revenue_per_deal_novosel_c = conv_novosel_c × aov_novosel_c
  revenue_per_deal_non_novosel_c = conv_non_novosel_c × aov_non_novosel_c
  revenue_premium_c = (revenue_per_deal_novosel_c / revenue_per_deal_non_novosel_c - 1) × 100%

project_per_client_premium = (projects_novosel / projects_non_novosel - 1) × 100%

# Динамический тренд: выводим 5 месяцев данных по выбранной метрике
```

**Визуализация:**
1. **Premium table:** строки = категории, колонки = AOV +%, Conv +pp, Rev/deal +%, Projects/client +%
2. **Trend chart (multi-line):** конверсия Новосел vs Не Новосел за 5 мес — для каждой категории
3. **Big comparison cards:** для выбранной категории — два блока (Новосел / Не Новосел) с ключевыми метриками side-by-side

---

## Формулы — полный псевдокод

```typescript
// lib/calculators/novosel-loyalty-impact.ts

interface NovoselInputs {
  category: 'bathroom' | 'kitchen' | 'storage' | 'all';
  marginPct: number;          // 0..1
  discountPerProject: number; // руб
  horizonMonths: number;
  targetNovoseloShare: number; // 0..1
  dealGrowthPct: number;       // ежемесячный рост потока, 0..1
  incrementality: 'full' | 'half' | 'none';
  scenario: 'share-growth' | 'category-compare' | 'segment-benchmark';
}

interface BaselineMetrics {
  byCategory: Record<string, {
    totalCreated: number;
    novelCreated: number;
    novAov: number;         // AOV Новосела
    nonNovAov: number;      // AOV Не Новосела
    novConversion: number;
    nonNovConversion: number;
    novRevenue: number;
    nonNovRevenue: number;
  }>;
  novoselProjectsPerClient: number;   // 1.25
  nonNovoselProjectsPerClient: number; // 1.10
  novoselPaidPerClient: number;       // 0.75
  nonNovoselPaidPerClient: number;    // 0.48
}

function computeScenarioA(inputs, baseline) {
  // Share growth scenario
  const incrementalityFactor =
    inputs.incrementality === 'full' ? 1 :
    inputs.incrementality === 'half' ? 0.5 : 0;

  let totalRevenue = 0;
  let totalDiscountCost = 0;
  // ... per category or 'all' aggregated
  // returns: baselineRevenue, scenarioRevenue, deltaRevenue,
  //          baselineNetMargin, scenarioNetMargin, deltaNetMargin, roiDiscount
}

function computeScenarioB(inputs, baseline) {
  // Category comparison
  // returns: per-category array of { revenue, grossMargin, discountCost, netMargin, roiDiscount }
}

function computeScenarioC(baseline) {
  // Segment benchmark — no scenario modelling, pure analytics
  // returns: premium indices per category + trend data
}
```

---

## Acceptance Criteria

### AC-1: Inputs
- [ ] Форма показывает auto-pulled baseline (AOV, конверсия, доля) с датой последнего обновления из Sheets
- [ ] Все sliders обновляют результат без перезагрузки страницы (debounce 300ms)
- [ ] При переключении категории (Kitchen ↔ Bathroom ↔ Storage ↔ All) пересчёт происходит мгновенно
- [ ] Tooltip на "incrementality" объясняет разницу простыми словами

### AC-2: Сценарий А (Share Growth)
- [ ] Waterfall chart рендерится с анимацией (bars вырастают снизу вверх)
- [ ] Slider «Целевая доля Новоселов» в реальном времени перестраивает waterfall
- [ ] При ROI дисконта < 1 — big number окрашивается в предупреждающий цвет (не зелёный, т.к. нет зелёного в бренде — использовать #B84A4A)
- [ ] Sensitivity line chart (доля 5–50% → net margin) позволяет найти break-even точку

### AC-3: Сценарий Б (Category Compare)
- [ ] Grouped bar chart по 3 категориям, 4 метрики каждая
- [ ] Radar chart с нормированными осями (100 = Kitchen как reference)
- [ ] Сортируемая таблица (по ROI дисконта по умолчанию)

### AC-4: Сценарий В (Segment Benchmark)
- [ ] Trend chart: 5 месяцев данных, переключение метрики (AOV / конверсия / выручка/сделку)
- [ ] Premium table с цветовым кодированием: чем выше premium — тем насыщеннее #FDC300
- [ ] Side-by-side cards не перекрываются на mobile

### AC-5: Сохранение сценария
- [ ] Кнопка «Сохранить сценарий» → в Firestore `scenarios/` с `baselineSnapshot` (снэпшот всех Sheets-данных на момент сохранения)
- [ ] У сценария автоматически генерируется имя: «Новосел — Кухня — 25% доля — 2026-05-07»
- [ ] Из списка сохранённых сценариев можно воспроизвести расчёт с теми же inputs

### AC-6: Формулы (проверяет QA независимо)
- [ ] Контрольный кейс 1: Kitchen, доля 11.7% (baseline), маржа 20%, дисконт 85k → net margin совпадает с ручным пересчётом
- [ ] Контрольный кейс 2: All categories, доля 25%, incrementality=full → ROI > 0
- [ ] Контрольный кейс 3: All categories, доля 25%, incrementality=none → ROI < 0 (дисконт — чистый убыток)

---

## Визуализации — детально

| # | Тип | Библиотека | Сценарий | Данные | Анимация |
|---|---|---|---|---|---|
| V1 | Waterfall | ECharts | А | baseline → novosel_revenue → discount → net | Bars вырастают снизу, 0.8с stagger |
| V2 | Line (sensitivity) | Recharts | А | X: доля 5–50%, Y: net margin | Realtime при движении slider |
| V3 | Grouped bar | ECharts | Б | 3 категории × 4 метрики | Bars вырастают, 1.0с stagger |
| V4 | Radar | ECharts | Б | 5 осей, 3 категории | Fade-in + polygon draw, 0.8с |
| V5 | Multi-line trend | Recharts | В | 5 мес, 2 линии (Новосел/Не Новосел) | Lines draw left-to-right, 1.5с |
| V6 | Table с heatmap | TanStack + CSS | В | Premium % по ячейкам | Fade-in |
| V7 | Big numbers × 4 | Framer Motion | А / Б | ΔВыручка, ΔNet margin, ROI, Cost | Counter 0→value, easeOut 1.2с |

**ECharts для V1, V3, V4** — именно они сложные (waterfall, radar). Recharts для V2, V5 — простые линии.

---

## Known constraints & edge cases

| Edge case | Как обрабатывать |
|---|---|
| Discount > AOV (напр. Storage AOV=74k < discount=85k) | Показать предупреждение «Дисконт превышает AOV — программа заведомо убыточна для Storage» |
| Доля Новоселов > 50% | Ограничить slider на 50% + tooltip «Исторический максимум — 19.4% (апр 2026)» |
| Incrementality = none + рост доли | Показать: «Без инкрементального эффекта рост доли Новоселов только увеличивает затраты на дисконт» |
| Горизонт 36 мес без данных о growth rate | Явно пометить: «Данные основаны на текущем baseline без учёта роста рынка — укажи % роста потока» |
| Все метрики "Нет данных" из Sheets | Показать баннер с причиной + кнопку "Обновить метрики" |

---

## Маппинг ячеек Sheets → калькулятор

| Поле в калькуляторе | Лист | Диапазон (предварительно) |
|---|---|---|
| AOV Новосел по категории | Детализация | строки Новосел, колонка "Средний чек" |
| Конверсия Новосел | Детализация | строки Новосел, колонка "Конверсия" |
| Создано сделок (Новосел + Всего) | Блок 1 | Bathroom/Kitchen/Storage, последний месяц |
| Проектов/клиент | Блок 3 | строки Новосел/Не Новосел |

> Точный маппинг в `lib/sheets/schema.ts` уточняется DEV при реализации — Дмитрий подтверждает соответствие ячеек.

---

## Definition of Done

- [ ] Все 3 сценария работают в браузере без ошибок
- [ ] Юнит-тесты на `computeScenarioA`, `computeScenarioB`, `computeScenarioC` (≥ 3 кейса каждая)
- [ ] QA: ручной пересчёт Kitchen baseline совпадает с калькулятором
- [ ] QA: все edge cases не вызывают crash (показывают предупреждение)
- [ ] Build passes, TypeScript strict
- [ ] Preview deploy на Vercel
- [ ] Сценарий сохраняется и воспроизводится корректно

---

## Связи

- Бэклог: [backlog/00_Backlog.md](../../backlog/00_Backlog.md) — добавлен как EPIC-2 → C-09, P0
- Каталог: [docs/06_Calculators_Catalog.md](../06_Calculators_Catalog.md)
- Стратегия ЛП: [[ROI Models стратегии]] — кейс КЦ +200M, кейс Новосел
- Pitch CPO: [[Pitch_Storyline]] — Шаг 3 «Системный подход»
