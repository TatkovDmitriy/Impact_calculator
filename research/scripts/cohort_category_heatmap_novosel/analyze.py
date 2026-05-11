"""
Чистая функция: DataFrame (deal_month, deal_type, total_deals, novosel_deals)
→ composite payload dict.
Тестируется через test_synthetic.py без подключения к GP.
"""
from __future__ import annotations

import math
from typing import Any


MIN_DEALS = 50  # порог: тип сделки включается в тепловую карту
DETAIL_KEYWORDS = ('kitchen', 'bathroom', 'storage')


def compute_payload(df) -> dict[str, Any]:
    """
    df: deal_month | deal_type | total_deals | novosel_deals

    Returns CompositePayload dict совместимый с lib/research/types.ts
    """
    import pandas as pd

    df = df.copy()
    df['deal_month'] = df['deal_month'].astype(str).str[:7]  # "YYYY-MM"
    df['total_deals'] = df['total_deals'].fillna(0).astype(int)
    df['novosel_deals'] = df['novosel_deals'].fillna(0).astype(int)

    # --- KPI ---
    total = int(df['total_deals'].sum())
    novosel = int(df['novosel_deals'].sum())
    penetration = round(novosel / total * 100, 1) if total > 0 else 0.0

    if len(df) > 0:
        df['share_pct'] = df.apply(
            lambda r: round(r['novosel_deals'] / r['total_deals'] * 100, 1)
            if r['total_deals'] > 0 else 0.0,
            axis=1,
        )
    else:
        df['share_pct'] = 0.0
    max_pen = float(df['share_pct'].max()) if len(df) > 0 else 0.0

    type_counts = df.groupby('deal_type')['total_deals'].sum()
    types_in_analysis = int((type_counts >= MIN_DEALS).sum())

    kpi_block: dict[str, Any] = {
        'kind': 'kpi',
        'items': [
            {'label': 'Проникновение Новоселов', 'value': penetration, 'unit': '%'},
            {'label': 'Максимальное проникновение', 'value': round(max_pen, 1), 'unit': '%'},
            {'label': 'Сделок с Новоселами', 'value': novosel, 'unit': 'шт'},
            {'label': 'Типов сделок в анализе', 'value': types_in_analysis, 'unit': 'шт'},
        ],
    }

    # --- Heatmap table: типы с >= MIN_DEALS сделок ---
    eligible_types = type_counts[type_counts >= MIN_DEALS].index.tolist()
    df_heat = df[df['deal_type'].isin(eligible_types)]

    months = sorted(df['deal_month'].unique().tolist())

    heatmap_columns = [{'key': 'deal_type', 'label': 'Тип сделки', 'type': 'string'}]
    for m in months:
        heatmap_columns.append({'key': m, 'label': m, 'type': 'percent'})

    pivot = (
        df_heat.pivot_table(
            index='deal_type', columns='deal_month',
            values='share_pct', aggfunc='first',
        )
        .fillna(0)
        .reindex(columns=months, fill_value=0)
    )

    heatmap_rows = []
    for deal_type, row in pivot.iterrows():
        r: dict[str, Any] = {'deal_type': str(deal_type)}
        for m in months:
            r[m] = round(float(row[m]), 1)
        heatmap_rows.append(r)

    heatmap_rows.sort(key=lambda r: -sum(v for k, v in r.items() if k != 'deal_type'))

    heatmap_block: dict[str, Any] = {
        'kind': 'table',
        'columns': heatmap_columns,
        'rows': heatmap_rows,
    }

    # --- Detail table: kitchen / bathroom / storage ---
    mask = df['deal_type'].str.lower().apply(
        lambda s: any(kw in s for kw in DETAIL_KEYWORDS)
    )
    df_detail = df[mask].copy()

    detail_columns = [
        {'key': 'deal_month',    'label': 'Месяц',         'type': 'string'},
        {'key': 'deal_type',     'label': 'Тип сделки',    'type': 'string'},
        {'key': 'total_deals',   'label': 'Всего сделок',  'type': 'number'},
        {'key': 'novosel_deals', 'label': 'Новоселов',     'type': 'number'},
        {'key': 'share_pct',     'label': 'Доля, %',       'type': 'percent'},
    ]

    detail_rows: list[dict[str, Any]] = []
    for _, row in (df_detail.sort_values(['deal_type', 'deal_month']) if len(df_detail) > 0 else df_detail).iterrows():
        detail_rows.append({
            'deal_month':    str(row['deal_month']),
            'deal_type':     str(row['deal_type']),
            'total_deals':   int(row['total_deals']),
            'novosel_deals': int(row['novosel_deals']),
            'share_pct':     round(float(row['share_pct']), 1),
        })

    detail_block: dict[str, Any] = {
        'kind': 'table',
        'columns': detail_columns,
        'rows': detail_rows,
    }

    return {
        'kind': 'composite',
        'blocks': [kpi_block, heatmap_block, detail_block],
    }


def _is_nan(value) -> bool:
    try:
        return math.isnan(float(value))
    except (TypeError, ValueError):
        return False
