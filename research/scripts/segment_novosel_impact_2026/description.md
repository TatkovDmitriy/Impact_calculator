# Исследование: Влияние сегмента «Новосел» на продажи (2026)

**Slug:** `segment_novosel_impact_2026`  
**Версия:** 1.0.0  
**Источник-ноутбук:** `research/notebooks/segment_novosel_impact_2026.ipynb`  
(оригинал: `D:\Analyses\Pyton\...__07.05.2026_4.ipynb`)

---

## Что измерили

Сравнение поведения двух клиентских сегментов в пресейл-воронке Лемана Про:
- **Новоселы** — клиенты с активным тегом `tag_catalog_id = '1'`, `is_actual = '1'`
- **База (Не новоселы)** — все остальные клиенты в той же воронке

Анализ охватывает период **декабрь 2025 – апрель 2026** в разрезе:
- типов сделок (bathroom, kitchen, storage, interior_door)
- магазинов (`storeid`)
- динамики по месяцам
- ключевых метрик: конверсия, AOV, маржа

---

## Источники данных

| Таблица | Что хранит |
|---|---|
| `presales_project_all_marts.v_presale_deals` | Пресейл-сделки: id, тип, выручка, маржа, дата создания, магазин |
| `customer_mdm_tags_ods.v_client_tags` | Теги клиентов: `tag_catalog_id = '1'` — «Новосел» |

Связь: `v_presale_deals.customer_systemid = v_client_tags.client_number`

---

## Методология

### Определение «Новосела»
```sql
LEFT JOIN customer_mdm_tags_ods.v_client_tags t
    ON d.customer_systemid = t.client_number
    AND t.tag_catalog_id = '1'
    AND t.is_actual = '1'
-- Новосел = t.client_number IS NOT NULL
```

### Временные окна
- **Основное окно:** 2025-12-01 – 2026-04-30 (5 месяцев)
- **Год-к-году (Кухни):** Янв–Апр 2025 vs Янв–Апр 2026
- **KPI-профиль:** 2026-01-01 – 2026-12-31 (факт до даты запуска)
- **Базовый бенчмарк (База 2025):** 2025-01-01 – 2025-12-31

### Конверсия
```
conversion_pct = paid_deals / total_deals * 100
paid_deal = проект с turnover_full > 0
```

### AOV (Average Order Value)
```
aov = total_revenue / paid_deals
```

---

## Разделы payload

| Ключ | Тип | Что содержит |
|---|---|---|
| `eda_tags` | `eda` | Структура таблицы v_client_tags |
| `eda_deals` | `eda` | Структура таблицы v_presale_deals |
| `deal_type_heatmap` | `heatmap` | Доля новосёлов (%) по типу сделки × месяц |
| `store_dynamics_bathroom` | `table` | Доля новосёлов по магазинам в «Ванных» |
| `category_dynamics` | `line_chart` × 4 | Ежемесячная доля новосёлов для каждой категории |
| `client_segment_dynamics` | `line_chart` × 4 | Уникальные клиенты Новосел vs База |
| `ab_comparison` | `table` | A/B: конверсия, AOV, выручка по категориям |
| `frequency_total` | `table` | Сделок на клиента по сегменту и месяцу |
| `kitchen_aov_yoy` | `table` | AOV Кухни 2025 vs 2026 |
| `segment_kpis` | `kpi` | Сводные KPI: Новосел 2026 / База 2026 / База 2025 |
| `client_clusters` | `table` | Кластеры клиентов по числу оплаченных проектов |

---

## Sanity checks

- [x] `novosel_2026.total_deals > 0`
- [x] `base_2026.total_deals > 0`
- [x] Конверсия в диапазоне [0, 100]%
- [x] Тест `test_synthetic.py` покрывает все функции анализа
- [ ] rowCount совпадает с ожидаемым из ноутбука-оригинала (±10%) — проверить после первого запуска

---

## Известные ограничения

1. **Дата присвоения тега не учитывается** — клиент считается Новоселом если тег актуален на момент запуска скрипта, не на дату создания сделки. Это соответствует подходу оригинального ноутбука.
2. **Сдвиг в апреле 2026** — данные за апрель могут быть неполными если запуск раньше конца месяца.
3. **Только SELECT** — никакие данные не модифицируются, row-level данные клиентов не публикуются.
4. **k-anonymity**: агрегаты по магазинам с `total_deals < 5` выводятся в payload, но должны фильтроваться в UI.

---

## Как воспроизвести

```bash
# Рабочий ПК, активный VPN
cd C:\Users\60110579\Impact_calculator
python research\scripts\segment_novosel_impact_2026\publish.py
```

Результат в Firestore: `research_items/segment_novosel_impact_2026`
