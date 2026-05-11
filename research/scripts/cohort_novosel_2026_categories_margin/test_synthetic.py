"""pytest — синтетические тесты без подключения к GP."""
import pandas as pd
import pytest
from analyze import compute_payload


# ---------------------------------------------------------------------------
# Фикстуры
# ---------------------------------------------------------------------------

def make_df():
    return pd.DataFrame([
        {'deal_month': '2026-01-01', 'count_clients': 180, 'count_deals': 210,
         'count_paid_deals': 95,  'total_budget': 14_250_000, 'total_margin': 2_850_000},
        {'deal_month': '2026-02-01', 'count_clients': 195, 'count_deals': 230,
         'count_paid_deals': 105, 'total_budget': 16_380_000, 'total_margin': 3_276_000},
        {'deal_month': '2026-03-01', 'count_clients': 220, 'count_deals': 265,
         'count_paid_deals': 122, 'total_budget': 19_520_000, 'total_margin': 3_904_000},
        {'deal_month': '2026-04-01', 'count_clients': 210, 'count_deals': 250,
         'count_paid_deals': 115, 'total_budget': 18_400_000, 'total_margin': 3_680_000},
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
    labels = [i['label'] for i in kpi['items']]
    assert 'Клиентов-Новоселов 2026' in labels
    assert 'Конверсия в оплату' in labels
    assert 'Бюджет оплаченных' in labels
    assert 'Маржинальность' in labels


def test_kpi_conversion_in_range():
    payload = compute_payload(make_df())
    kpi_map = {i['label']: i['value'] for i in payload['blocks'][0]['items']}
    conv = kpi_map['Конверсия в оплату']
    # 437 оплаченных / 955 сделок ≈ 45.8%
    assert 30.0 <= conv <= 70.0


def test_kpi_margin_pct_in_range():
    payload = compute_payload(make_df())
    kpi_map = {i['label']: i['value'] for i in payload['blocks'][0]['items']}
    margin_pct = kpi_map['Маржинальность']
    # 13_710_000 / 68_550_000 ≈ 20%
    assert 10.0 <= margin_pct <= 40.0


# ---------------------------------------------------------------------------
# Line chart
# ---------------------------------------------------------------------------

def test_line_chart_block():
    payload = compute_payload(make_df())
    line = payload['blocks'][1]
    assert line['kind'] == 'line_chart'
    assert line['yUnit'] == 'шт'
    assert len(line['xAxis']) == 4
    assert len(line['series']) == 2


def test_line_series_lengths_match():
    payload = compute_payload(make_df())
    line = payload['blocks'][1]
    n = len(line['xAxis'])
    for s in line['series']:
        assert len(s['data']) == n


def test_line_all_values_nonneg():
    payload = compute_payload(make_df())
    line = payload['blocks'][1]
    for s in line['series']:
        assert all(v >= 0 for v in s['data'])


# ---------------------------------------------------------------------------
# Table
# ---------------------------------------------------------------------------

def test_table_block():
    payload = compute_payload(make_df())
    tbl = payload['blocks'][2]
    assert tbl['kind'] == 'table'
    assert len(tbl['rows']) == 8  # 8 метрик из METRIC_DEFS


def test_table_has_metric_column():
    payload = compute_payload(make_df())
    tbl = payload['blocks'][2]
    col_keys = [c['key'] for c in tbl['columns']]
    assert 'metric' in col_keys
    assert 'total' in col_keys


def test_table_has_month_columns():
    payload = compute_payload(make_df())
    tbl = payload['blocks'][2]
    col_keys = [c['key'] for c in tbl['columns']]
    assert '2026-01' in col_keys
    assert '2026-04' in col_keys


def test_table_total_column_filled():
    payload = compute_payload(make_df())
    tbl = payload['blocks'][2]
    for row in tbl['rows']:
        assert 'total' in row


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------

def test_empty_dataframe():
    df = pd.DataFrame(columns=[
        'deal_month', 'count_clients', 'count_deals',
        'count_paid_deals', 'total_budget', 'total_margin',
    ])
    try:
        payload = compute_payload(df)
        assert payload['kind'] == 'composite'
    except (ZeroDivisionError, KeyError, IndexError) as e:
        pytest.fail(f'Исключение на пустых данных: {e}')


def test_zero_deals_no_division_error():
    df = pd.DataFrame([{
        'deal_month': '2026-01-01', 'count_clients': 0, 'count_deals': 0,
        'count_paid_deals': 0, 'total_budget': 0, 'total_margin': 0,
    }])
    payload = compute_payload(df)
    assert payload['kind'] == 'composite'


def test_no_nan_in_payload():
    import json
    payload = compute_payload(make_df())
    flat = json.dumps(payload)
    assert 'NaN' not in flat
