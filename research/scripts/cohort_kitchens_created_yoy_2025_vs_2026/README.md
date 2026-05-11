# cohort_kitchens_created_yoy_2025_vs_2026

**Slug:** `cohort_kitchens_created_yoy_2025_vs_2026`
**Категория:** cohorts
**Payload:** composite (kpi + bar_chart + table с totalRow)
**Версия скрипта:** 1.0.0

## Источник

Ноутбук `research/notebooks/Потенциал Новоселов 07.05.2026.ipynb`, ячейка 17.

## Запросы

Один SQL-запрос: `month_num × period_year → total_deals`.

Источник: `presales_project_all_marts.v_presale_deals`

## Sanity baseline

| Метрика | Ожидаемый диапазон |
|---|---|
| Строк из GP | 6–10 |
| Сделок янв–апр 2026 | 300–1000 |
| YoY рост | -20% … +50% |

## Запуск

```bash
cd research && python scripts/cohort_kitchens_created_yoy_2025_vs_2026/publish.py
cd research && python scripts/cohort_kitchens_created_yoy_2025_vs_2026/publish_synthetic.py
cd research/scripts/cohort_kitchens_created_yoy_2025_vs_2026 && pytest test_synthetic.py -v
```
