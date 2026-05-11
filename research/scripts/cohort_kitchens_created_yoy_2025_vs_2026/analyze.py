"""
Чистая функция: DataFrame (month_num, period_year, total_deals)
→ composite payload dict.
Тестируется через test_synthetic.py без подключения к GP.
"""
from __future__ import annotations

import math
from typing import Any


MONTH_NAMES = {
    1: 'Янв', 2: 'Фев', 3: 'Мар', 4: 'Апр',
    5: 'Май', 6: 'Июн', 7: 'Июл', 8: 'Авг',
    9: 'Сен', 10: 'Окт', 11: 'Ноя', 12: 'Дек',
}


def compute_payload(df) -> dict[str, Any]:
    """
    df: month_num | period_year | total_deals

    Returns CompositePayload dict совместимый с lib/research/types.ts
    """
    import pandas as pd

    df = df.copy()
    df['total_deals'] = df['total_deals'].fillna(0).astype(int)

    years = sorted(df['period_year'].unique().tolist())
    if len(years) == 0:
        year1, year2 = '2025', '2026'
    elif len(years) == 1:
        year1 = year2 = years[0]
    else:
        year1, year2 = years[0], years[1]

    months_present = sorted(df['month_num'].unique().tolist())

    pivot = (
        df.pivot_table(index='month_num', columns='period_year', values='total_deals', aggfunc='sum')
        .fillna(0)
        .reindex(index=months_present)
        .fillna(0)
    )

    total1 = int(pivot.get(year1, pd.Series([0] * len(months_present))).sum())
    total2 = int(pivot.get(year2, pd.Series([0] * len(months_present))).sum())
    growth_pct = round((total2 / total1 - 1) * 100, 1) if total1 > 0 else 0.0

    # --- KPI ---
    kpi_block: dict[str, Any] = {
        'kind': 'kpi',
        'items': [
            {
                'label': f'Создано сделок {year2} (янв–апр)',
                'value': total2,
                'unit': 'шт',
                'delta': growth_pct,
                'deltaUnit': f'% к {year1}',
            },
            {
                'label': f'Создано сделок {year1} (янв–апр)',
                'value': total1,
                'unit': 'шт',
            },
            {
                'label': 'Прирост год к году',
                'value': total2 - total1,
                'unit': 'шт',
                'delta': growth_pct,
                'deltaUnit': '%',
            },
            {
                'label': 'Месяцев в анализе',
                'value': len(months_present),
                'unit': 'шт',
            },
        ],
    }

    # --- Bar chart: кол-во сделок по месяцам ---
    x_axis = [MONTH_NAMES.get(m, str(m)) for m in months_present]

    def get_series(year):
        col = pivot[year] if year in pivot.columns else pd.Series([0] * len(months_present))
        return [int(col.iloc[i]) for i in range(len(months_present))]

    bar_block: dict[str, Any] = {
        'kind': 'bar_chart',
        'xAxis': x_axis,
        'series': [
            {'name': str(year1), 'color': '#6B7B7C', 'data': get_series(year1)},
            {'name': str(year2), 'color': '#FDC300', 'data': get_series(year2)},
        ],
        'yUnit': 'шт',
        'stacked': False,
    }

    # --- Table: помесячная таблица с дельтой ---
    table_columns = [
        {'key': 'month',      'label': 'Месяц',              'type': 'string'},
        {'key': 'deals_y1',   'label': f'Сделок {year1}',    'type': 'number'},
        {'key': 'deals_y2',   'label': f'Сделок {year2}',    'type': 'number'},
        {'key': 'delta',      'label': 'Δ шт',               'type': 'number'},
        {'key': 'growth_pct', 'label': 'Рост, %',            'type': 'percent'},
    ]

    table_rows: list[dict[str, Any]] = []
    for m in months_present:
        d1 = int(pivot.loc[m, year1]) if year1 in pivot.columns else 0
        d2 = int(pivot.loc[m, year2]) if year2 in pivot.columns else 0
        delta = d2 - d1
        gp = round((d2 / d1 - 1) * 100, 1) if d1 > 0 else 0.0
        table_rows.append({
            'month':      MONTH_NAMES.get(m, str(m)),
            'deals_y1':   d1,
            'deals_y2':   d2,
            'delta':      delta,
            'growth_pct': gp,
        })

    total_row: dict[str, Any] = {
        'month':      'ИТОГО',
        'deals_y1':   total1,
        'deals_y2':   total2,
        'delta':      total2 - total1,
        'growth_pct': growth_pct,
    }

    table_block: dict[str, Any] = {
        'kind': 'table',
        'columns': table_columns,
        'rows': table_rows,
        'totalRow': total_row,
    }

    return {
        'kind': 'composite',
        'blocks': [kpi_block, bar_block, table_block],
    }


def _is_nan(value) -> bool:
    try:
        return math.isnan(float(value))
    except (TypeError, ValueError):
        return False
