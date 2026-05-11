# cohort_category_heatmap_novosel

**Slug:** `cohort_category_heatmap_novosel`
**Категория:** cohorts
**Payload:** composite (kpi + table heatmap + table detail)
**Версия скрипта:** 1.0.0

## Источник

Ноутбук `research/notebooks/Потенциал Новоселов 07.05.2026.ipynb`, ячейка 3.

## Запросы

Один SQL-запрос: `deal_month × deal_type → total_deals, novosel_deals`.

Источники:
- `presales_project_all_marts.v_presale_deals`
- `customer_mdm_tags_ods.v_client_tags` (LEFT JOIN, tag_catalog_id='1', is_actual='1')

## Sanity baseline

| Метрика | Ожидаемый диапазон |
|---|---|
| rowCount (строк из GP) | 100–500 |
| Уникальных типов сделок | 10–40 |
| Типов в тепловой карте (≥50 сделок) | 5–20 |
| Проникновение Новоселов, % | 5–40 |

## Запуск

```bash
# Production (требует GP и Firestore credentials)
cd research && python scripts/cohort_category_heatmap_novosel/publish.py

# UI-тест (синтетика → _outbox)
cd research && python scripts/cohort_category_heatmap_novosel/publish_synthetic.py

# Unit-тесты
cd research/scripts/cohort_category_heatmap_novosel && pytest test_synthetic.py -v
```
