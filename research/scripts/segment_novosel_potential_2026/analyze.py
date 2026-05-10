"""
Чистая функция: два DataFrame (penetration, aov) → composite payload dict.
Тестируется через test_synthetic.py без подключения к GP.
"""
from __future__ import annotations

import math
from typing import Any


PRIORITY_CATEGORIES = ['Кухни', 'Ванные', 'Хранение', 'Двери']


def compute_payload(df_penetration, df_aov) -> dict[str, Any]:
    """
    df_penetration: deal_month | category | total_deals | novosel_deals
    df_aov:         category | client_segment | paid_deals | avg_aov | avg_margin

    Returns CompositePayload dict совместимый с lib/research/types.ts
    """
    import pandas as pd

    df_p = df_penetration.copy()
    df_a = df_aov.copy()

    # --- фильтр приоритетных категорий ---
    df_p = df_p[df_p['category'].isin(PRIORITY_CATEGORIES)]
    df_a = df_a[df_a['category'].isin(PRIORITY_CATEGORIES)]

    # --- KPI блок ---
    total_deals   = int(df_p['total_deals'].sum())
    total_novosel = int(df_p['novosel_deals'].sum())
    penetration   = round(total_novosel / total_deals * 100, 1) if total_deals > 0 else 0.0

    novosel_aov = df_a[df_a['client_segment'] == 'Новосел']['avg_aov'].mean()
    base_aov    = df_a[df_a['client_segment'] == 'База']['avg_aov'].mean()
    aov_uplift  = round((novosel_aov / base_aov - 1) * 100, 1) if base_aov and base_aov > 0 else 0.0

    novosel_margin = df_a[df_a['client_segment'] == 'Новосел']['avg_margin'].mean()

    kpi_block = {
        'kind': 'kpi',
        'items': [
            {
                'label': 'Проникновение Новоселов',
                'value': penetration,
                'unit': '%',
            },
            {
                'label': 'AOV Новоселов',
                'value': _safe_round(novosel_aov),
                'unit': '₽',
                'delta': aov_uplift,
                'deltaUnit': '% к базе',
            },
            {
                'label': 'Средняя маржа Новоселов',
                'value': _safe_round(novosel_margin),
                'unit': '₽',
            },
            {
                'label': 'Сделок проанализировано',
                'value': total_deals,
                'unit': 'шт',
            },
        ],
    }

    # --- line_chart: тренд проникновения по месяцам ---
    df_p['novosel_share'] = (
        df_p['novosel_deals'] / df_p['total_deals'] * 100
    ).round(1)

    pivot = (
        df_p.pivot_table(
            index='deal_month', columns='category',
            values='novosel_share', aggfunc='first'
        )
        .fillna(0)
        .sort_index()
    )

    x_axis = [str(m)[:7] for m in pivot.index.tolist()]  # "YYYY-MM"

    COLORS = {
        'Кухни':    '#FDC300',
        'Ванные':   '#2F3738',
        'Хранение': '#6B7B7C',
        'Двери':    '#B0B8B9',
    }

    line_series = [
        {
            'name': cat,
            'color': COLORS.get(cat),
            'data': [
                round(float(v), 1) if not _is_nan(v) else 0.0
                for v in pivot[cat].tolist()
            ],
        }
        for cat in PRIORITY_CATEGORIES
        if cat in pivot.columns
    ]

    line_block = {
        'kind': 'line_chart',
        'xAxis': x_axis,
        'series': line_series,
        'yUnit': '%',
    }

    # --- bar_chart: AOV Новосел vs База по категориям ---
    aov_pivot = (
        df_a.pivot_table(
            index='category', columns='client_segment',
            values='avg_aov', aggfunc='mean'
        )
        .fillna(0)
        .reindex(PRIORITY_CATEGORIES)
        .fillna(0)
    )

    bar_x = PRIORITY_CATEGORIES
    bar_series = [
        {
            'name': seg,
            'color': '#FDC300' if seg == 'Новосел' else '#6B7B7C',
            'data': [
                _safe_round(aov_pivot.loc[cat, seg])
                if cat in aov_pivot.index and seg in aov_pivot.columns
                else 0
                for cat in bar_x
            ],
        }
        for seg in ['Новосел', 'База']
    ]

    bar_block = {
        'kind': 'bar_chart',
        'xAxis': bar_x,
        'series': bar_series,
        'yUnit': '₽',
        'stacked': False,
    }

    return {
        'kind': 'composite',
        'blocks': [kpi_block, line_block, bar_block],
    }


def _safe_round(value, ndigits: int = 0) -> int | float:
    if value is None or _is_nan(value):
        return 0
    return int(round(float(value), ndigits))


def _is_nan(value) -> bool:
    try:
        return math.isnan(float(value))
    except (TypeError, ValueError):
        return False
