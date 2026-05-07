# 06 — Каталог калькуляторов

## Принцип каталога

Каждый калькулятор — отдельный плагин со своим slug, формой ввода, формулой и визуализацией. Регистрируется в `lib/calculators/registry.ts`. UI каталога автоматически рендерит карточки для всех зарегистрированных калькуляторов.

## Структура плагина

```typescript
// lib/calculators/types.ts
export interface CalculatorPlugin<I, O> {
  slug: string;                      // 'novosel-loyalty-impact'
  title: string;
  description: string;
  category: 'revenue' | 'cx' | 'ops' | 'risk';
  inputsSchema: ZodSchema<I>;        // валидация формы
  requiredMetrics: string[];         // ключи из SHEET_RANGES
  compute: (inputs: I, baseline: BaselineMetrics) => O;
  visualization: VizSpec;            // графики/таблицы в режиме одного сценария
  compareVisualization: CompareVizSpec; // как отображать несколько сценариев на дашборде
  scenarioDefaults: ScenarioPreset[]; // 2-3 готовых пресета (baseline / optimistic / pessimistic)
  version: string;                   // semver — для истории сценариев
}

// Обязательно для каждого калькулятора:
export interface ScenarioPreset<I> {
  label: string;        // 'Базовый', 'Оптимистичный', 'Консервативный'
  color: string;        // цвет линии/бара на дашборде (#FDC300 / #2F3738 / #8B8B8B)
  inputs: Partial<I>;   // только те поля, которые отличаются от дефолта
}

// Spec для сравнительного дашборда
export interface CompareVizSpec {
  primaryMetric: string;   // ключ в O, который идёт на основной overlay chart
  deltaMetrics: string[];  // метрики для delta table
  sensitivityAxis: keyof I; // input для оси X sensitivity chart
}
```

## Каталог (реализованные и в разработке)

### C-09 — Новосел: программа лояльности (FIRST BUILT — P0)

> **Slug:** `novosel-loyalty-impact` | **Spec:** [calculators/C-09_novosel_loyalty.md](calculators/C-09_novosel_loyalty.md)

**Вопрос:** стоит ли дисконт до 85 000 руб. той выручки и маржи, которую приносят Новоселы? Три сценария:
1. «Что если доля Новоселов вырастет?» — waterfall margin при росте доли с 14.7% до N%
2. «Какой проектный мир выгоднее?» — Bathroom vs Kitchen vs Storage по ROI дисконта
3. «Новосел vs Не Новосел — насколько лучше?» — аналитика premium-индексов

**Baseline (апр 2026):** Kitchen AOV Новосел +47%, конверсия +25.9пп, выручка/сделку в 3.5× выше.

**Inputs:** маржа проекта (%), дисконт (руб), горизонт (мес), категория, целевая доля, incrementality.

**Visualizations:** Waterfall (ECharts), Sensitivity line (Recharts), Grouped bar × Radar (ECharts), Multi-line trend, Premium heatmap table.

---

## Backlog калькуляторов

Полный бэклог с RICE → [backlog/00_Backlog.md](../backlog/00_Backlog.md).

### Стартовый набор (под Q3 2026 pitch CPO)

| # | Slug | Название | Вопрос, на который отвечает | Приоритет |
|---|---|---|---|---|
| C-01 | `revenue-uplift` | Прирост выручки от фичи | «Сколько +₽ даст фича Х за 12 мес?» | P0 |
| C-02 | `conversion-funnel` | Влияние на конверсию воронки | «Если конверсия этапа Y вырастет на N%, сколько +₽?» | P0 |
| C-03 | `aov-uplift` | Рост среднего чека | «Если AOV в сегменте Z вырастет на M%, сколько +маржа?» | P1 |
| C-04 | `nps-revenue` | NPS → выручка | «Сколько +₽ от роста NPS на K пунктов через retention/recommendation?» | P1 |
| C-05 | `downtime-cost` | Стоимость простоя инструмента | «Сколько теряем в день, если планировщик X не работает?» | P1 |
| C-06 | `vendor-switch-roi` | ROI смены вендора | «Окупится ли замена Ceramic 3D на E-Kitchen с учётом миграции?» | P2 |
| C-07 | `partner-network-roi` | ROI партнёрской сети мастеров | «Сколько +₽ от подключения сети из N мастеров за 18 мес?» | P2 |
| C-08 | `cx-rescue-roi` | ROI спасения через КЦ | «Кейс +200 млн — реплицируется на другие сегменты?» | P2 |

## Спецификация: C-01 Revenue Uplift (пример)

**Вопрос:** Сколько дополнительной выручки даст фича за горизонт N месяцев?

**Inputs:**
- `featureName: string`
- `affectedSegment: 'kitchen' | 'bathroom' | 'flooring' | 'all'`
- `expectedConversionLift: number` — % прироста конверсии (например, 0.05 = +5%)
- `expectedAovLift: number` — % прироста AOV
- `rolloutMonths: number` — за сколько месяцев фича выйдет на полную ёмкость
- `horizonMonths: number` — горизонт расчёта (12 / 18 / 24)

**Baseline (из Sheets):**
- `monthlyRevenueBySegment[segment]`
- `monthlyOrdersBySegment[segment]`
- `aovBySegment[segment]`

**Формула:**
```
для каждого месяца m в [1..horizonMonths]:
  ramp = min(m / rolloutMonths, 1)
  newConversion = baseConversion * (1 + expectedConversionLift * ramp)
  newAov = baseAov * (1 + expectedAovLift * ramp)
  uplift_m = (newConversion * newAov - baseConversion * baseAov) * baseTraffic
totalUplift = Σ uplift_m
```

**Визуализация:**
- Area chart: baseline vs new revenue по месяцам
- Big number: cumulative uplift
- Таблица: разбивка по месяцам (m, baseline, new, delta, %)
- Анимация: появление area-fill снизу вверх + counter-анимация big number

## Conventions

- **Slug** — kebab-case
- **Версия** — bump на minor при изменении формулы (старые сценарии должны быть пересчитываемы), на major — при breaking changes в схеме inputs
- **Все формулы — pure functions без I/O.** Тестируются юнит-тестами (Vitest)
- **Категории** окрашены в палитру ЛП: revenue (yellow accent), cx, ops, risk — нейтральные оттенки
