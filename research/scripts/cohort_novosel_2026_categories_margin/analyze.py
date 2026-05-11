"""
Чистая функция: DataFrame (deal_month, count_clients, count_deals,
count_paid_deals, total_budget, total_margin) → composite payload dict.
Тестируется через test_synthetic.py без подключения к GP.
"""
from __future__ import annotations

import math
from typing import Any


ALL_MONTHS = [f'2026-{m:02d}' for m in range(1, 13)]

METRIC_DEFS = [
    ('count_clients',    'Уникальных клиентов',  'чел',  'number'),
    ('count_deals',      'Создано сделок',        'шт',   'number'),
    ('count_paid_deals', 'Оплаченных сделок',     'шт',   'number'),
    ('conversion_pct',   'Конверсия в оплату',    '%',    'percent'),
    ('deals_per_client', 'Сделок на клиента',     'шт',   'number'),
    ('total_budget',     'Бюджет оплаченных',     '₽',    'currency'),
    ('total_margin',     'Маржа оплаченных',      '₽',    'currency'),
    ('aov',              'Средний чек (AOV)',      '₽',    'currency'),
]


def compute_payload(df) -> dict[str, Any]:
    """
    df: deal_month | count_clients | count_deals | count_paid_deals
            | total_budget | total_margin

    Returns CompositePayload dict совместимый с lib/research/types.ts
    """
    import pandas as pd

    df = df.copy()
    df['deal_month'] = df['deal_month'].astype(str).str[:7]  # "YYYY-MM"

    for col in ('count_clients', 'count_deals', 'count_paid_deals'):
        df[col] = df[col].fillna(0).astype(int)
    for col in ('total_budget', 'total_margin'):
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

    df['conversion_pct'] = df.apply(
        lambda r: round(r['count_paid_deals'] / r['count_deals'] * 100, 1)
        if r['count_deals'] > 0 else 0.0,
        axis=1,
    )
    df['deals_per_client'] = df.apply(
        lambda r: round(r['count_deals'] / r['count_clients'], 2)
        if r['count_clients'] > 0 else 0.0,
        axis=1,
    )
    df['aov'] = df.apply(
        lambda r: round(r['total_budget'] / r['count_paid_deals'], 0)
        if r['count_paid_deals'] > 0 else 0.0,
        axis=1,
    )

    # --- KPI ---
    total_clients = int(df['count_clients'].sum())
    total_deals   = int(df['count_deals'].sum())
    total_paid    = int(df['count_paid_deals'].sum())
    total_budget  = float(df['total_budget'].sum())
    total_margin  = float(df['total_margin'].sum())
    conv_overall  = round(total_paid / total_deals * 100, 1) if total_deals > 0 else 0.0
    aov_overall   = round(total_budget / total_paid, 0) if total_paid > 0 else 0.0
    margin_pct    = round(total_margin / total_budget * 100, 1) if total_budget > 0 else 0.0

    kpi_block: dict[str, Any] = {
        'kind': 'kpi',
        'items': [
            {'label': 'Клиентов-Новоселов 2026',    'value': total_clients,       'unit': 'чел'},
            {'label': 'Конверсия в оплату',          'value': conv_overall,        'unit': '%'},
            {'label': 'Бюджет оплаченных',           'value': _safe_int(total_budget),  'unit': '₽'},
            {'label': 'Маржинальность',              'value': margin_pct,          'unit': '%'},
        ],
    }

    # --- Table: матрица метрик × месяцы ---
    months_in_data = sorted(df['deal_month'].unique().tolist())
    df_indexed = df.set_index('deal_month')

    # Колонки: "Метрика" + один столбец на каждый месяц + "ИТОГО"
    table_columns = [{'key': 'metric', 'label': 'Метрика', 'type': 'string'}]
    for m in months_in_data:
        table_columns.append({'key': m, 'label': m, 'type': 'number'})
    table_columns.append({'key': 'total', 'label': 'ИТОГО', 'type': 'number'})

    table_rows: list[dict[str, Any]] = []
    for col_key, label, unit, col_type in METRIC_DEFS:
        row: dict[str, Any] = {'metric': f'{label}, {unit}'}
        for m in months_in_data:
            if m in df_indexed.index:
                val = df_indexed.loc[m, col_key]
                row[m] = _format_value(val, col_type)
            else:
                row[m] = None
        # ИТОГО: суммируем числовые/аддитивные, берём агрегат для производных
        if col_key in ('count_clients', 'count_deals', 'count_paid_deals', 'total_budget', 'total_margin'):
            row['total'] = _format_value(df[col_key].sum(), col_type)
        elif col_key == 'conversion_pct':
            row['total'] = conv_overall
        elif col_key == 'aov':
            row['total'] = _safe_int(aov_overall)
        elif col_key == 'deals_per_client':
            row['total'] = round(total_deals / total_clients, 2) if total_clients > 0 else 0.0
        else:
            row['total'] = None
        table_rows.append(row)

    table_block: dict[str, Any] = {
        'kind': 'table',
        'columns': table_columns,
        'rows': table_rows,
    }

    # --- Line chart: динамика клиентов и сделок ---
    line_block: dict[str, Any] = {
        'kind': 'line_chart',
        'xAxis': months_in_data,
        'series': [
            {
                'name': 'Клиенты',
                'color': '#FDC300',
                'data': [
                    int(df_indexed.loc[m, 'count_clients']) if m in df_indexed.index else 0
                    for m in months_in_data
                ],
            },
            {
                'name': 'Оплаченные сделки',
                'color': '#2F3738',
                'data': [
                    int(df_indexed.loc[m, 'count_paid_deals']) if m in df_indexed.index else 0
                    for m in months_in_data
                ],
            },
        ],
        'yUnit': 'шт',
    }

    return {
        'kind': 'composite',
        'blocks': [kpi_block, line_block, table_block],
    }


def _format_value(val, col_type: str):
    if val is None or _is_nan(val):
        return None
    if col_type in ('currency', 'number'):
        return _safe_int(val)
    if col_type == 'percent':
        return round(float(val), 1)
    return float(val)


def _safe_int(value) -> int:
    if value is None or _is_nan(value):
        return 0
    return int(round(float(value), 0))


def _is_nan(value) -> bool:
    try:
        return math.isnan(float(value))
    except (TypeError, ValueError):
        return False
