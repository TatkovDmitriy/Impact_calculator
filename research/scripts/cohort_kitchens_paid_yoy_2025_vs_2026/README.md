# cohort_kitchens_paid_yoy_2025_vs_2026

**Slug:** `cohort_kitchens_paid_yoy_2025_vs_2026`
**Категория:** cohorts
**Payload:** composite (kpi + line_chart AOV + bar_chart сегменты)
**Версия скрипта:** 1.0.0

## Источник

Ноутбук `research/notebooks/Потенциал Новоселов 07.05.2026.ipynb`, ячейка 16.

## Запросы

Два SQL-запроса, разделённых `;`:
1. Помесячная динамика: `month_num × period_year → deal_count, total_revenue`
2. Ценовые сегменты: `period_year × price_segment → deal_count`

Источник: `presales_project_all_marts.v_presale_deals`

## Sanity baseline

| Метрика | Ожидаемый диапазон |
|---|---|
| Строк monthly (GP) | 6–10 (по 3–5 месяцев на год) |
| Строк segments (GP) | 8–12 |
| Сделок за янв–апр 2026 | 300–800 |
| YoY рост кол-ва сделок | -20% … +50% |

## Запуск

```bash
cd research && python scripts/cohort_kitchens_paid_yoy_2025_vs_2026/publish.py
cd research && python scripts/cohort_kitchens_paid_yoy_2025_vs_2026/publish_synthetic.py
cd research/scripts/cohort_kitchens_paid_yoy_2025_vs_2026 && pytest test_synthetic.py -v
```
