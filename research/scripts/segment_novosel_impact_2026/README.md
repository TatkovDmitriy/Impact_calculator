# segment_novosel_impact_2026

Анализ влияния тега «Новосел» на продажи в воронке пресейла (Дек'25 – Апр'26).

## Как запустить

```bash
# Рабочий ПК, активный VPN
cd C:\Users\60110579\Impact_calculator
python research\scripts\segment_novosel_impact_2026\publish.py
```

## Что нужно скопировать в чат

```
- exit code
- первые 15 строк stdout
- строки с ERROR или WARN
- значения из строки "Segment KPIs" (clients и deals для всех трёх сегментов)
```

## Запуск unit-тестов (личный ПК, без VPN)

```bash
cd research
pip install -r requirements.txt pytest
pytest scripts/segment_novosel_impact_2026/test_synthetic.py -v
```

Ожидаемый результат: **все тесты зелёные**, 0 ошибок.

## Зависимости

```
psycopg2-binary, pandas, numpy, python-dotenv
```

Firebase-публикация опциональна (через `shared/fb_publisher.py`). При его отсутствии
payload сохраняется в `research/_outbox/segment_novosel_impact_2026.json`.

## Ожидаемые rowCount (ориентир из ноутбука)

| Запрос | Ожидаемый порядок |
|---|---|
| EDA tags sample | 1 000 строк |
| EDA deals sample | 1 000 строк |
| Deal type heatmap | ~100–200 строк (типы × месяцы) |
| Category dynamics | ~4 строки / категория |
| AB comparison | ~50–150 строк |
| Client clusters | ~тысячи клиентов |

## Структура файлов

```
segment_novosel_impact_2026/
├── query.sql            # 14 именованных SQL-блоков
├── analyze.py           # чистые функции DataFrame → dict
├── publish.py           # оркестратор (GP → analyze → Firebase)
├── test_synthetic.py    # pytest на mock-данных
├── description.md       # методология и описание payload
└── README.md            # этот файл
```

## Sanity checks

- [ ] Итого сделок новосёлов 2026 > 0 (assert в publish.py)
- [ ] Конверсия в диапазоне [0%, 100%] (assert в publish.py)
- [ ] Количество строк в heatmap соответствует ожидаемому ±10%
- [ ] AOV кухни 2026 выше или сопоставимо с 2025
