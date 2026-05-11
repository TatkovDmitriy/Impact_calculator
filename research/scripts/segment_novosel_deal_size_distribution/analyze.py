"""
Чистая функция: DataFrame (aov_segment, count_clients, total_paid_deals, total_gmv, total_margin)
→ composite payload dict.
Тестируется через test_synthetic.py без подключения к GP.
"""
from __future__ import annotations

import math
from typing import Any


AOV_SEGMENT_ORDER = [
    '1. До 50 000 руб.',
    '2. 50 001–100 000 руб.',
    '3. 100 001–150 000 руб.',
    '4. 150 001–200 000 руб.',
    '5. Свыше 200 000 руб.',
]


def compute_payload(df) -> dict[str, Any]:
    """
    df: aov_segment | count_clients | total_paid_deals | total_gmv | total_margin

    Returns CompositePayload dict совместимый с lib/research/types.ts
    """
    import pandas as pd

    df = df.copy()
    df['count_clients']    = df['count_clients'].fillna(0).astype(int)
    df['total_paid_deals'] = df['total_paid_deals'].fillna(0).astype(int)
    df['total_gmv']        = pd.to_numeric(df['total_gmv'], errors='coerce').fillna(0)
    df['total_margin']     = pd.to_numeric(df['total_margin'], errors='coerce').fillna(0)

    total_clients = int(df['count_clients'].sum())
    total_gmv     = float(df['total_gmv'].sum())
    total_margin  = float(df['total_margin'].sum())
    total_deals   = int(df['total_paid_deals'].sum())

    margin_pct = round(total_margin / total_gmv * 100, 1) if total_gmv > 0 else 0.0

    # Mode segment (most clients)
    if len(df) > 0 and total_clients > 0:
        top_row = df.loc[df['count_clients'].idxmax()]
        top_segment = str(top_row['aov_segment'])
        top_share = round(int(top_row['count_clients']) / total_clients * 100, 1)
    else:
        top_segment = '—'
        top_share = 0.0

    # --- KPI ---
    kpi_block: dict[str, Any] = {
        'kind': 'kpi',
        'items': [
            {
                'label': 'Платящих клиентов-Новоселов',
                'value': total_clients,
                'unit': 'чел',
            },
            {
                'label': 'GMV Новоселов',
                'value': _safe_int(total_gmv),
                'unit': '₽',
            },
            {
                'label': 'Маржинальность',
                'value': margin_pct,
                'unit': '%',
            },
            {
                'label': 'Доля крупнейшего сегмента',
                'value': top_share,
                'unit': '%',
            },
        ],
    }

    # --- Bar chart: count_clients по AOV-сегменту ---
    df_ordered = df.set_index('aov_segment').reindex(AOV_SEGMENT_ORDER).fillna(0)

    bar_block: dict[str, Any] = {
        'kind': 'bar_chart',
        'xAxis': AOV_SEGMENT_ORDER,
        'series': [
            {
                'name': 'Клиентов',
                'color': '#FDC300',
                'data': [
                    int(df_ordered.loc[seg, 'count_clients'])
                    for seg in AOV_SEGMENT_ORDER
                ],
            }
        ],
        'yUnit': 'чел',
        'stacked': False,
    }

    # --- Table: детализация по сегменту ---
    table_columns = [
        {'key': 'aov_segment',    'label': 'Сегмент AOV',              'type': 'string'},
        {'key': 'count_clients',  'label': 'Клиентов',                  'type': 'number'},
        {'key': 'share_clients',  'label': 'Доля клиентов, %',          'type': 'percent'},
        {'key': 'total_gmv',      'label': 'GMV, ₽',                    'type': 'currency'},
        {'key': 'share_gmv',      'label': 'Доля GMV, %',               'type': 'percent'},
        {'key': 'margin_pct',     'label': 'Маржинальность, %',         'type': 'percent'},
        {'key': 'deals_per_client', 'label': 'Оплат на клиента',        'type': 'number'},
    ]

    table_rows: list[dict[str, Any]] = []
    for seg in AOV_SEGMENT_ORDER:
        if seg not in df['aov_segment'].values:
            table_rows.append({
                'aov_segment':    seg,
                'count_clients':  0,
                'share_clients':  0.0,
                'total_gmv':      0,
                'share_gmv':      0.0,
                'margin_pct':     0.0,
                'deals_per_client': 0.0,
            })
            continue
        row = df[df['aov_segment'] == seg].iloc[0]
        cc = int(row['count_clients'])
        gv = float(row['total_gmv'])
        mg = float(row['total_margin'])
        pd_ = int(row['total_paid_deals'])
        table_rows.append({
            'aov_segment':      seg,
            'count_clients':    cc,
            'share_clients':    round(cc / total_clients * 100, 1) if total_clients > 0 else 0.0,
            'total_gmv':        _safe_int(gv),
            'share_gmv':        round(gv / total_gmv * 100, 1) if total_gmv > 0 else 0.0,
            'margin_pct':       round(mg / gv * 100, 1) if gv > 0 else 0.0,
            'deals_per_client': round(pd_ / cc, 2) if cc > 0 else 0.0,
        })

    total_row: dict[str, Any] = {
        'aov_segment':      'ИТОГО',
        'count_clients':    total_clients,
        'share_clients':    100.0,
        'total_gmv':        _safe_int(total_gmv),
        'share_gmv':        100.0,
        'margin_pct':       margin_pct,
        'deals_per_client': round(total_deals / total_clients, 2) if total_clients > 0 else 0.0,
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


def _safe_int(value) -> int:
    if value is None or _is_nan(value):
        return 0
    return int(round(float(value), 0))


def _is_nan(value) -> bool:
    try:
        return math.isnan(float(value))
    except (TypeError, ValueError):
        return False
