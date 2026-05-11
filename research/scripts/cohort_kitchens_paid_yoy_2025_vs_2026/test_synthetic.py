"""pytest — синтетические тесты без подключения к GP."""
import pandas as pd
import pytest
from analyze import compute_payload


# ---------------------------------------------------------------------------
# Фикстуры
# ---------------------------------------------------------------------------

def make_monthly():
    return pd.DataFrame([
        {'month_num': 1, 'period_year': '2025', 'deal_count': 80,  'total_revenue': 12_000_000},
        {'month_num': 2, 'period_year': '2025', 'deal_count': 90,  'total_revenue': 13_500_000},
        {'month_num': 3, 'period_year': '2025', 'deal_count': 100, 'total_revenue': 15_000_000},
        {'month_num': 4, 'period_year': '2025', 'deal_count': 95,  'total_revenue': 14_250_000},
        {'month_num': 1, 'period_year': '2026', 'deal_count': 95,  'total_revenue': 14_725_000},
        {'month_num': 2, 'period_year': '2026', 'deal_count': 105, 'total_revenue': 16_380_000},
        {'month_num': 3, 'period_year': '2026', 'deal_count': 115, 'total_revenue': 18_630_000},
        {'month_num': 4, 'period_year': '2026', 'deal_count': 110, 'total_revenue': 17_600_000},
    ])


def make_segments():
    return pd.DataFrame([
        {'period_year': '2025', 'price_segment': 'до 100к',    'deal_count': 50},
        {'period_year': '2025', 'price_segment': '100–250к',   'deal_count': 120},
        {'period_year': '2025', 'price_segment': '250–500к',   'deal_count': 130},
        {'period_year': '2025', 'price_segment': '500к–1М',    'deal_count': 55},
        {'period_year': '2025', 'price_segment': '1М+',        'deal_count': 10},
        {'period_year': '2026', 'price_segment': 'до 100к',    'deal_count': 45},
        {'period_year': '2026', 'price_segment': '100–250к',   'deal_count': 130},
        {'period_year': '2026', 'price_segment': '250–500к',   'deal_count': 155},
        {'period_year': '2026', 'price_segment': '500к–1М',    'deal_count': 78},
        {'period_year': '2026', 'price_segment': '1М+',        'deal_count': 17},
    ])


# ---------------------------------------------------------------------------
# Структура payload
# ---------------------------------------------------------------------------

def test_payload_is_composite():
    payload = compute_payload(make_monthly(), make_segments())
    assert payload['kind'] == 'composite'
    assert len(payload['blocks']) == 3


def test_kpi_block():
    payload = compute_payload(make_monthly(), make_segments())
    kpi = payload['blocks'][0]
    assert kpi['kind'] == 'kpi'
    assert len(kpi['items']) == 4


def test_kpi_has_delta():
    payload = compute_payload(make_monthly(), make_segments())
    kpi_items = payload['blocks'][0]['items']
    assert 'delta' in kpi_items[0]
    delta = kpi_items[0]['delta']
    # 2026: 425 сделок, 2025: 365 → рост ~16.4%
    assert 10.0 <= delta <= 25.0


def test_kpi_values_positive():
    payload = compute_payload(make_monthly(), make_segments())
    for item in payload['blocks'][0]['items']:
        assert item['value'] >= 0


# ---------------------------------------------------------------------------
# Line chart
# ---------------------------------------------------------------------------

def test_line_chart_block():
    payload = compute_payload(make_monthly(), make_segments())
    line = payload['blocks'][1]
    assert line['kind'] == 'line_chart'
    assert line['yUnit'] == '₽'
    assert len(line['xAxis']) == 4  # 4 месяца
    assert len(line['series']) == 2  # 2025 и 2026


def test_line_chart_series_lengths_match():
    payload = compute_payload(make_monthly(), make_segments())
    line = payload['blocks'][1]
    n = len(line['xAxis'])
    for s in line['series']:
        assert len(s['data']) == n


def test_aov_2026_higher_than_2025():
    payload = compute_payload(make_monthly(), make_segments())
    line = payload['blocks'][1]
    series_map = {s['name']: s['data'] for s in line['series']}
    avg_2026 = sum(series_map['2026']) / len(series_map['2026'])
    avg_2025 = sum(series_map['2025']) / len(series_map['2025'])
    assert avg_2026 > avg_2025, 'AOV 2026 должен быть выше 2025'


# ---------------------------------------------------------------------------
# Bar chart
# ---------------------------------------------------------------------------

def test_bar_chart_block():
    payload = compute_payload(make_monthly(), make_segments())
    bar = payload['blocks'][2]
    assert bar['kind'] == 'bar_chart'
    assert bar['yUnit'] == 'шт'
    assert len(bar['xAxis']) == 5  # 5 ценовых сегментов
    assert len(bar['series']) == 2


def test_bar_chart_all_values_nonneg():
    payload = compute_payload(make_monthly(), make_segments())
    bar = payload['blocks'][2]
    for s in bar['series']:
        assert all(v >= 0 for v in s['data'])


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------

def test_empty_monthly():
    df_m = pd.DataFrame(columns=['month_num', 'period_year', 'deal_count', 'total_revenue'])
    df_s = make_segments()
    # не должно бросать исключение
    try:
        payload = compute_payload(df_m, df_s)
        assert payload['kind'] == 'composite'
    except (ZeroDivisionError, KeyError, IndexError) as e:
        pytest.fail(f'Исключение на пустых данных: {e}')


def test_no_nan_in_payload():
    import json
    payload = compute_payload(make_monthly(), make_segments())
    flat = json.dumps(payload)
    assert 'NaN' not in flat
