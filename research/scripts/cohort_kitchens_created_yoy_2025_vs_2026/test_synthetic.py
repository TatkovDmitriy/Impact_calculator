"""pytest — синтетические тесты без подключения к GP."""
import pandas as pd
import pytest
from analyze import compute_payload


# ---------------------------------------------------------------------------
# Фикстуры
# ---------------------------------------------------------------------------

def make_df():
    return pd.DataFrame([
        {'month_num': 1, 'period_year': '2025', 'total_deals': 120},
        {'month_num': 2, 'period_year': '2025', 'total_deals': 135},
        {'month_num': 3, 'period_year': '2025', 'total_deals': 150},
        {'month_num': 4, 'period_year': '2025', 'total_deals': 140},
        {'month_num': 1, 'period_year': '2026', 'total_deals': 142},
        {'month_num': 2, 'period_year': '2026', 'total_deals': 158},
        {'month_num': 3, 'period_year': '2026', 'total_deals': 175},
        {'month_num': 4, 'period_year': '2026', 'total_deals': 162},
    ])


# ---------------------------------------------------------------------------
# Структура payload
# ---------------------------------------------------------------------------

def test_payload_is_composite():
    payload = compute_payload(make_df())
    assert payload['kind'] == 'composite'
    assert len(payload['blocks']) == 3


def test_kpi_block():
    payload = compute_payload(make_df())
    kpi = payload['blocks'][0]
    assert kpi['kind'] == 'kpi'
    assert len(kpi['items']) == 4


def test_kpi_growth_positive():
    payload = compute_payload(make_df())
    kpi_map = {i['label']: i for i in payload['blocks'][0]['items']}
    key = next(k for k in kpi_map if 'Создано' in k and '2026' in k)
    delta = kpi_map[key]['delta']
    assert delta > 0, 'Ожидается положительный рост'
    # 2026: 637, 2025: 545 → ~16.9%
    assert 10.0 <= delta <= 25.0


# ---------------------------------------------------------------------------
# Bar chart
# ---------------------------------------------------------------------------

def test_bar_chart_block():
    payload = compute_payload(make_df())
    bar = payload['blocks'][1]
    assert bar['kind'] == 'bar_chart'
    assert bar['yUnit'] == 'шт'
    assert len(bar['xAxis']) == 4
    assert len(bar['series']) == 2


def test_bar_series_names():
    payload = compute_payload(make_df())
    bar = payload['blocks'][1]
    names = [s['name'] for s in bar['series']]
    assert '2025' in names
    assert '2026' in names


def test_bar_2026_higher_than_2025():
    payload = compute_payload(make_df())
    bar = payload['blocks'][1]
    series_map = {s['name']: s['data'] for s in bar['series']}
    assert sum(series_map['2026']) > sum(series_map['2025'])


# ---------------------------------------------------------------------------
# Table
# ---------------------------------------------------------------------------

def test_table_block():
    payload = compute_payload(make_df())
    tbl = payload['blocks'][2]
    assert tbl['kind'] == 'table'
    assert len(tbl['rows']) == 4  # 4 месяца
    col_keys = [c['key'] for c in tbl['columns']]
    assert 'month' in col_keys
    assert 'deals_y1' in col_keys
    assert 'deals_y2' in col_keys
    assert 'delta' in col_keys
    assert 'growth_pct' in col_keys


def test_table_total_row():
    payload = compute_payload(make_df())
    tbl = payload['blocks'][2]
    assert 'totalRow' in tbl
    assert tbl['totalRow']['month'] == 'ИТОГО'
    assert tbl['totalRow']['deals_y1'] == 545
    assert tbl['totalRow']['deals_y2'] == 637


def test_table_delta_correct():
    payload = compute_payload(make_df())
    tbl = payload['blocks'][2]
    for row in tbl['rows']:
        assert row['delta'] == row['deals_y2'] - row['deals_y1']


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------

def test_empty_dataframe():
    df = pd.DataFrame(columns=['month_num', 'period_year', 'total_deals'])
    try:
        payload = compute_payload(df)
        assert payload['kind'] == 'composite'
    except (KeyError, IndexError, ZeroDivisionError) as e:
        pytest.fail(f'Исключение на пустых данных: {e}')


def test_no_nan_in_payload():
    import json
    payload = compute_payload(make_df())
    flat = json.dumps(payload)
    assert 'NaN' not in flat
