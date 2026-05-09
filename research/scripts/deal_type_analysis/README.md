# deal_type_analysis

**Pilot R1** — Распределение сделок по типу (deal_type)

## Как запустить

```bash
cd C:\Users\60110579\Impact_calculator
python research\scripts\deal_type_analysis\run.py
```

Требует активный VPN (доступ к Greenplum).

## Что делает

1. Подключается к Greenplum через `research/.env`
2. Считает уникальные сделки по `deal_type` с января 2024
3. Генерирует `research/output/deal_type_dashboard.html`

## Sanity checks

- [ ] Итого сделок совпадает с ожидаемым порядком величин (тысячи/десятки тысяч)
- [ ] Нет пустого deal_type без причины (заменён на «[не указан]»)
- [ ] Топ-3 типа логичны с точки зрения бизнеса

## Зависимости

```
psycopg2-binary, pandas, plotly, python-dotenv
```

## Источник данных

`presales_project_all_marts.v_presale_deals` — обновляется ежесуточно в 04:00
