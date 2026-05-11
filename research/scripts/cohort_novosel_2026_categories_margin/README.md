# cohort_novosel_2026_categories_margin

**Slug:** `cohort_novosel_2026_categories_margin`
**Категория:** cohorts
**Payload:** composite (kpi + line_chart + table метрики × месяцы)
**Версия скрипта:** 1.0.0

## Источник

Ноутбук `research/notebooks/Потенциал Новоселов 07.05.2026.ipynb`, ячейка 19.

## Запрос

Один SQL-запрос: INNER JOIN с тегами Новоселов, агрегация по месяцам за весь 2026 год.

Источники:
- `presales_project_all_marts.v_presale_deals`
- `customer_mdm_tags_ods.v_client_tags` (INNER JOIN, tag_catalog_id='1', is_actual='1')

## Sanity baseline

| Метрика | Ожидаемый диапазон |
|---|---|
| Строк из GP (месяцев) | 1–12 |
| Клиентов-Новоселов за период | 500–5000 |
| Конверсия в оплату | 30–70% |
| Маржинальность | 10–30% |

## Запуск

```bash
cd research && python scripts/cohort_novosel_2026_categories_margin/publish.py
cd research && python scripts/cohort_novosel_2026_categories_margin/publish_synthetic.py
cd research/scripts/cohort_novosel_2026_categories_margin && pytest test_synthetic.py -v
```
