"""pytest — синтетические тесты без подключения к GP."""
import pandas as pd
import pytest
from analyze import compute_payload, AOV_SEGMENT_ORDER


# ---------------------------------------------------------------------------
# Фикстуры
# ---------------------------------------------------------------------------

def make_df():
    """Реалистичные синтетические данные: 5 AOV-сегментов."""
    return pd.DataFrame([
        {'aov_segment': '1. До 50 000 руб.',       'count_clients': 150, 'total_paid_deals': 160, 'total_gmv': 4_500_000,  'total_margin': 900_000},
        {'aov_segment': '2. 50 001–100 000 руб.',  'count_clients': 320, 'total_paid_deals': 350, 'total_gmv': 24_000_000, 'total_margin': 5_000_000},
        {'aov_segment': '3. 100 001–150 000 руб.', 'count_clients': 180, 'total_paid_deals': 200, 'total_gmv': 24_000_000, 'total_margin': 5_500_000},
        {'aov_segment': '4. 150 001–200 000 руб.', 'count_clients': 90,  'total_paid_deals': 100, 'total_gmv': 16_500_000, 'total_margin': 4_000_000},
        {'aov_segment': '5. Свыше 200 000 руб.',   'count_clients': 60,  'total_paid_deals': 70,  'total_gmv': 17_000_000, 'total_margin': 4_200_000},
    ])


# ---------------------------------------------------------------------------
# Структура payload
# ---------------------------------------------------------------------------

def test_payload_is_composite():
    payload = compute_payload(make_df())
    assert payload['kind'] == 'composite'
    assert len(payload['blocks']) == 3


def test_kpi_block_structure():
    payload = compute_payload(make_df())
    kpi = payload['blocks'][0]
    assert kpi['kind'] == 'kpi'
    assert len(kpi['items']) == 4
    labels = [i['label'] for i in kpi['items']]
    assert 'Платящих клиентов-Новоселов' in labels
    assert 'GMV Новоселов' in labels
    assert 'Маржинальность' in labels
    assert 'Доля крупнейшего сегмента' in labels


def test_kpi_total_clients():
    payload = compute_payload(make_df())
    kpi_map = {i['label']: i['value'] for i in payload['blocks'][0]['items']}
    assert kpi_map['Платящих клиентов-Новоселов'] == 800  # 150+320+180+90+60


def test_kpi_margin_in_range():
    payload = compute_payload(make_df())
    kpi_map = {i['label']: i['value'] for i in payload['blocks'][0]['items']}
    assert 0 < kpi_map['Маржинальность'] < 100


def test_top_share_is_segment_2():
    payload = compute_payload(make_df())
    kpi_map = {i['label']: i['value'] for i in payload['blocks'][0]['items']}
    # Segment 2 has 320 clients = 40%
    assert abs(kpi_map['Доля крупнейшего сегмента'] - 40.0) < 0.5


# ---------------------------------------------------------------------------
# Bar chart
# ---------------------------------------------------------------------------

def test_bar_chart_structure():
    payload = compute_payload(make_df())
    bc = payload['blocks'][1]
    assert bc['kind'] == 'bar_chart'
    assert bc['yUnit'] == 'чел'
    assert len(bc['xAxis']) == 5
    assert len(bc['series']) == 1


def test_bar_chart_all_segments_present():
    payload = compute_payload(make_df())
    bc = payload['blocks'][1]
    assert bc['xAxis'] == AOV_SEGMENT_ORDER


def test_bar_chart_data_sum():
    payload = compute_payload(make_df())
    bc = payload['blocks'][1]
    assert sum(bc['series'][0]['data']) == 800


def test_bar_chart_values_non_negative():
    payload = compute_payload(make_df())
    bc = payload['blocks'][1]
    for v in bc['series'][0]['data']:
        assert v >= 0


# ---------------------------------------------------------------------------
# Table
# ---------------------------------------------------------------------------

def test_table_block_structure():
    payload = compute_payload(make_df())
    tbl = payload['blocks'][2]
    assert tbl['kind'] == 'table'
    col_keys = [c['key'] for c in tbl['columns']]
    assert 'aov_segment' in col_keys
    assert 'count_clients' in col_keys
    assert 'share_clients' in col_keys
    assert 'total_gmv' in col_keys
    assert 'margin_pct' in col_keys
    assert 'deals_per_client' in col_keys


def test_table_row_count():
    payload = compute_payload(make_df())
    tbl = payload['blocks'][2]
    assert len(tbl['rows']) == 5


def test_table_has_total_row():
    payload = compute_payload(make_df())
    tbl = payload['blocks'][2]
    assert 'totalRow' in tbl
    assert tbl['totalRow']['aov_segment'] == 'ИТОГО'
    assert tbl['totalRow']['share_clients'] == 100.0


def test_table_shares_sum_to_100():
    payload = compute_payload(make_df())
    tbl = payload['blocks'][2]
    total_share = sum(r['share_clients'] for r in tbl['rows'])
    assert abs(total_share - 100.0) < 0.5


def test_table_margin_pct_in_range():
    payload = compute_payload(make_df())
    tbl = payload['blocks'][2]
    for row in tbl['rows']:
        if row['count_clients'] > 0:
            assert 0 <= row['margin_pct'] <= 100


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------

def test_empty_dataframe():
    df = pd.DataFrame(columns=['aov_segment', 'count_clients', 'total_paid_deals', 'total_gmv', 'total_margin'])
    payload = compute_payload(df)
    assert payload['kind'] == 'composite'
    kpi_map = {i['label']: i['value'] for i in payload['blocks'][0]['items']}
    assert kpi_map['Платящих клиентов-Новоселов'] == 0


def test_zero_gmv_no_error():
    df = pd.DataFrame([{
        'aov_segment': '1. До 50 000 руб.',
        'count_clients': 10, 'total_paid_deals': 10,
        'total_gmv': 0, 'total_margin': 0,
    }])
    payload = compute_payload(df)
    assert payload['kind'] == 'composite'


def test_missing_segments_filled_with_zeros():
    df = pd.DataFrame([{
        'aov_segment': '3. 100 001–150 000 руб.',
        'count_clients': 50, 'total_paid_deals': 55,
        'total_gmv': 6_000_000, 'total_margin': 1_200_000,
    }])
    payload = compute_payload(df)
    tbl = payload['blocks'][2]
    assert len(tbl['rows']) == 5
    zero_rows = [r for r in tbl['rows'] if r['aov_segment'] != '3. 100 001–150 000 руб.']
    for r in zero_rows:
        assert r['count_clients'] == 0


def test_no_nan_in_payload():
    import json
    payload = compute_payload(make_df())
    flat = json.dumps(payload)
    assert 'NaN' not in flat
