# segment_novosel_deal_size_distribution

**Slug:** `segment_novosel_deal_size_distribution`
**Категория:** segments
**Payload:** composite (kpi + bar_chart + table)
**Версия скрипта:** 1.0.0

## Источник

Ноутбук `research/notebooks/Потенциал Новоселов 07.05.2026.ipynb`, ячейка 23 (`sql_aov_segments`).

## Запрос

Один SQL-запрос: INNER JOIN с тегами Новоселов, агрегация по AOV-сегменту за 2026 год.

Источники:
- `presales_project_all_marts.v_presale_deals`
- `customer_mdm_tags_ods.v_client_tags` (INNER JOIN, tag_catalog_id='1', is_actual='1')

## Sanity baseline

| Метрика | Ожидаемый диапазон |
|---|---|
| Строк из GP (сегментов) | 3–5 |
| Платящих клиентов-Новоселов | 300–5000 |
| Маржинальность | 15–35% |
| Топ-сегмент по клиентам | 2. 50 001–100 000 руб. |

## Примечание по сегментам AOV

В задании указаны 3 диапазона (до 100к / 100–300к / 300к+), но в ноутбуке используются 5 диапазонов. Реализовано по ноутбуку; уточнение направлено PM.

## Запуск

```bash
cd research && python scripts/segment_novosel_deal_size_distribution/publish.py
cd research && python scripts/segment_novosel_deal_size_distribution/publish_synthetic.py
cd research/scripts/segment_novosel_deal_size_distribution && pytest test_synthetic.py -v
```
