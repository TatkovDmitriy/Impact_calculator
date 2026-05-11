# segment_novosel_repeat_buyers

**Slug:** `segment_novosel_repeat_buyers`
**Категория:** segments
**Payload:** composite (kpi + line_chart + table)
**Версия скрипта:** 1.0.0

## Источник

Ноутбук `research/notebooks/Потенциал Новоселов 07.05.2026.ipynb`, ячейка 15 (`sql_freq_total`).

## Запрос

Один SQL-запрос: LEFT JOIN с тегами Новоселов, группировка по месяцам и сегменту (Новосел / Не Новосел) за дек 2025 – апр 2026.

Источники:
- `presales_project_all_marts.v_presale_deals`
- `customer_mdm_tags_ods.v_client_tags` (LEFT JOIN, tag_catalog_id='1', is_actual='1')

## Sanity baseline

| Метрика | Ожидаемый диапазон |
|---|---|
| Строк из GP (месяц × сегмент) | 8–12 |
| Уникальных клиентов-Новоселов | 400–3000 |
| avg_paid (Новосел) | 1.0–3.0 |
| avg_paid (База) | 0.8–2.0 |

## Запуск

```bash
cd research && python scripts/segment_novosel_repeat_buyers/publish.py
cd research && python scripts/segment_novosel_repeat_buyers/publish_synthetic.py
cd research/scripts/segment_novosel_repeat_buyers && pytest test_synthetic.py -v
```
