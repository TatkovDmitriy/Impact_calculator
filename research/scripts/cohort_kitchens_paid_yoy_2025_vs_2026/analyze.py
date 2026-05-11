"""
Чистая функция: два DataFrame (monthly, segments) → composite payload dict.
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
SEGMENT_ORDER = ['до 100к', '100–250к', '250–500к', '500к–1М', '1М+']


def compute_payload(df_monthly, df_segments) -> dict[str, Any]:
    """
    df_monthly:  month_num | period_year | deal_count | total_revenue
    df_segments: period_year | price_segment | deal_count

    Returns CompositePayload dict совместимый с lib/research/types.ts
    """
    import pandas as pd

    dfm = df_monthly.copy()
    dfs = df_segments.copy()

    dfm['deal_count'] = dfm['deal_count'].fillna(0).astype(int)
    dfm['total_revenue'] = pd.to_numeric(dfm['total_revenue'], errors='coerce').fillna(0)
    if len(dfm) > 0:
        dfm['aov'] = dfm.apply(
            lambda r: round(r['total_revenue'] / r['deal_count'], 0)
            if r['deal_count'] > 0 else 0.0,
            axis=1,
        )
    else:
        dfm['aov'] = 0.0

    years = sorted(dfm['period_year'].unique().tolist())
    if len(years) == 0:
        year1, year2 = '2025', '2026'
    elif len(years) == 1:
        year1 = year2 = years[0]
    else:
        year1, year2 = years[0], years[1]

    # --- KPI ---
    total1 = int(dfm[dfm['period_year'] == year1]['deal_count'].sum())
    total2 = int(dfm[dfm['period_year'] == year2]['deal_count'].sum())
    growth_pct = round((total2 / total1 - 1) * 100, 1) if total1 > 0 else 0.0

    rev1 = float(dfm[dfm['period_year'] == year1]['total_revenue'].sum())
    rev2 = float(dfm[dfm['period_year'] == year2]['total_revenue'].sum())
    rev_growth_pct = round((rev2 / rev1 - 1) * 100, 1) if rev1 > 0 else 0.0

    aov1 = round(rev1 / total1, 0) if total1 > 0 else 0.0
    aov2 = round(rev2 / total2, 0) if total2 > 0 else 0.0

    kpi_block: dict[str, Any] = {
        'kind': 'kpi',
        'items': [
            {
                'label': f'Сделок {year2} (янв–апр)',
                'value': total2,
                'unit': 'шт',
                'delta': growth_pct,
                'deltaUnit': f'% к {year1}',
            },
            {
                'label': f'Выручка {year2} (янв–апр)',
                'value': _safe_int(rev2),
                'unit': '₽',
                'delta': rev_growth_pct,
                'deltaUnit': f'% к {year1}',
            },
            {
                'label': f'AOV {year2}',
                'value': _safe_int(aov2),
                'unit': '₽',
                'delta': round((aov2 / aov1 - 1) * 100, 1) if aov1 > 0 else 0.0,
                'deltaUnit': f'% к {year1}',
            },
            {
                'label': f'Сделок {year1} (янв–апр)',
                'value': total1,
                'unit': 'шт',
            },
        ],
    }

    # --- Line chart: AOV по месяцам ---
    months_present = sorted(dfm['month_num'].unique().tolist())
    x_axis = [MONTH_NAMES.get(m, str(m)) for m in months_present]

    def get_aov_series(year):
        sub = dfm[dfm['period_year'] == year].set_index('month_num')
        return [
            _safe_int(sub.loc[m, 'aov']) if m in sub.index else 0
            for m in months_present
        ]

    line_block: dict[str, Any] = {
        'kind': 'line_chart',
        'xAxis': x_axis,
        'series': [
            {'name': str(year1), 'color': '#6B7B7C', 'data': get_aov_series(year1)},
            {'name': str(year2), 'color': '#FDC300', 'data': get_aov_series(year2)},
        ],
        'yUnit': '₽',
    }

    # --- Bar chart: ценовые сегменты ---
    dfs['deal_count'] = dfs['deal_count'].fillna(0).astype(int)

    seg_pivot = (
        dfs.pivot_table(
            index='price_segment', columns='period_year',
            values='deal_count', aggfunc='sum',
        )
        .fillna(0)
        .reindex(SEGMENT_ORDER)
        .fillna(0)
    )

    bar_block: dict[str, Any] = {
        'kind': 'bar_chart',
        'xAxis': SEGMENT_ORDER,
        'series': [
            {
                'name': str(yr),
                'color': '#6B7B7C' if yr == year1 else '#FDC300',
                'data': [
                    int(seg_pivot.loc[s, yr])
                    if s in seg_pivot.index and yr in seg_pivot.columns else 0
                    for s in SEGMENT_ORDER
                ],
            }
            for yr in [year1, year2]
        ],
        'yUnit': 'шт',
        'stacked': False,
    }

    return {
        'kind': 'composite',
        'blocks': [kpi_block, line_block, bar_block],
    }


def _safe_int(value) -> int:
    if value is None or _is_nan(value):
        return 0
    return int(round(float(value), 0))


def _is_nan(value) -> bool:
    try:
        return math.isnan(float(value))
    except (TypeError, ValueError):
        return False
