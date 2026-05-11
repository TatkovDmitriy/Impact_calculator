"""
Чистая функция: DataFrame (deal_month, client_segment, unique_clients, total_deals, paid_deals)
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

SEG_NOVOSEL = 'Новосел'
SEG_BASE = 'Не Новосел'


def compute_payload(df) -> dict[str, Any]:
    """
    df: deal_month | client_segment | unique_clients | total_deals | paid_deals

    Returns CompositePayload dict совместимый с lib/research/types.ts
    """
    import pandas as pd

    df = df.copy()
    df['deal_month'] = df['deal_month'].astype(str).str[:7]  # "YYYY-MM"
    df['unique_clients'] = df['unique_clients'].fillna(0).astype(int)
    df['paid_deals'] = df['paid_deals'].fillna(0).astype(int)
    df['total_deals'] = df['total_deals'].fillna(0).astype(int)

    if len(df) > 0:
        df['avg_paid'] = df.apply(
            lambda r: round(r['paid_deals'] / r['unique_clients'], 2)
            if r['unique_clients'] > 0 else 0.0,
            axis=1,
        )
        df['avg_created'] = df.apply(
            lambda r: round(r['total_deals'] / r['unique_clients'], 2)
            if r['unique_clients'] > 0 else 0.0,
            axis=1,
        )
    else:
        df['avg_paid'] = 0.0
        df['avg_created'] = 0.0

    nov_df = df[df['client_segment'] == SEG_NOVOSEL]
    base_df = df[df['client_segment'] == SEG_BASE]

    total_nov_clients = int(nov_df['unique_clients'].sum())
    total_nov_paid = int(nov_df['paid_deals'].sum())
    total_base_clients = int(base_df['unique_clients'].sum())
    total_base_paid = int(base_df['paid_deals'].sum())

    avg_paid_nov = round(total_nov_paid / total_nov_clients, 2) if total_nov_clients > 0 else 0.0
    avg_paid_base = round(total_base_paid / total_base_clients, 2) if total_base_clients > 0 else 0.0
    premium = round((avg_paid_nov / avg_paid_base - 1) * 100, 1) if avg_paid_base > 0 else 0.0

    # --- KPI ---
    kpi_block: dict[str, Any] = {
        'kind': 'kpi',
        'items': [
            {
                'label': 'Сред. оплаченных проектов (Новосел)',
                'value': avg_paid_nov,
                'unit': 'шт/клиент',
                'delta': premium,
                'deltaUnit': '% к Базе',
            },
            {
                'label': 'Сред. оплаченных проектов (База)',
                'value': avg_paid_base,
                'unit': 'шт/клиент',
            },
            {
                'label': 'Уникальных клиентов-Новоселов',
                'value': total_nov_clients,
                'unit': 'чел',
            },
            {
                'label': 'Месяцев в анализе',
                'value': len(df['deal_month'].unique()),
                'unit': 'шт',
            },
        ],
    }

    # --- Line chart: avg_paid_per_client по месяцам ---
    months_present = sorted(df['deal_month'].unique().tolist())
    x_axis = months_present

    def get_avg_series(sub_df):
        idx = sub_df.set_index('deal_month')['avg_paid']
        return [round(float(idx.get(m, 0.0)), 2) for m in months_present]

    line_block: dict[str, Any] = {
        'kind': 'line_chart',
        'xAxis': x_axis,
        'series': [
            {'name': SEG_NOVOSEL, 'color': '#FDC300', 'data': get_avg_series(nov_df)},
            {'name': SEG_BASE,    'color': '#6B7B7C', 'data': get_avg_series(base_df)},
        ],
        'yUnit': 'шт/клиент',
    }

    # --- Table: помесячная детализация ---
    table_columns = [
        {'key': 'deal_month',         'label': 'Месяц',                           'type': 'string'},
        {'key': 'nov_clients',        'label': 'Новоселов (чел)',                  'type': 'number'},
        {'key': 'nov_avg_paid',       'label': 'Avg оплат (Новосел)',              'type': 'number'},
        {'key': 'base_clients',       'label': 'База (чел)',                       'type': 'number'},
        {'key': 'base_avg_paid',      'label': 'Avg оплат (База)',                 'type': 'number'},
        {'key': 'premium_pct',        'label': 'Новосел vs База, %',              'type': 'percent'},
    ]

    nov_idx = nov_df.set_index('deal_month')
    base_idx = base_df.set_index('deal_month')

    table_rows: list[dict[str, Any]] = []
    for m in months_present:
        nc = int(nov_idx.loc[m, 'unique_clients']) if m in nov_idx.index else 0
        np_ = round(float(nov_idx.loc[m, 'avg_paid']), 2) if m in nov_idx.index else 0.0
        bc = int(base_idx.loc[m, 'unique_clients']) if m in base_idx.index else 0
        bp = round(float(base_idx.loc[m, 'avg_paid']), 2) if m in base_idx.index else 0.0
        prem = round((np_ / bp - 1) * 100, 1) if bp > 0 else 0.0
        table_rows.append({
            'deal_month':    m,
            'nov_clients':   nc,
            'nov_avg_paid':  np_,
            'base_clients':  bc,
            'base_avg_paid': bp,
            'premium_pct':   prem,
        })

    total_row: dict[str, Any] = {
        'deal_month':    'ИТОГО / СРЕДн',
        'nov_clients':   total_nov_clients,
        'nov_avg_paid':  avg_paid_nov,
        'base_clients':  total_base_clients,
        'base_avg_paid': avg_paid_base,
        'premium_pct':   premium,
    }

    table_block: dict[str, Any] = {
        'kind': 'table',
        'columns': table_columns,
        'rows': table_rows,
        'totalRow': total_row,
    }

    return {
        'kind': 'composite',
        'blocks': [kpi_block, line_block, table_block],
    }


def _is_nan(value) -> bool:
    try:
        return math.isnan(float(value))
    except (TypeError, ValueError):
        return False
