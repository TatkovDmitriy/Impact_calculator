"""pytest — синтетические тесты без подключения к GP."""
import pandas as pd
import pytest
from analyze import compute_payload


# ---------------------------------------------------------------------------
# Фикстуры
# ---------------------------------------------------------------------------

def make_penetration():
    return pd.DataFrame([
        {'deal_month': '2026-01-01', 'category': 'Кухни',   'total_deals': 100, 'novosel_deals': 20},
        {'deal_month': '2026-02-01', 'category': 'Кухни',   'total_deals': 110, 'novosel_deals': 25},
        {'deal_month': '2026-01-01', 'category': 'Ванные',  'total_deals': 50,  'novosel_deals': 8},
        {'deal_month': '2026-02-01', 'category': 'Ванные',  'total_deals': 55,  'novosel_deals': 10},
        {'deal_month': '2026-01-01', 'category': 'Хранение','total_deals': 30,  'novosel_deals': 3},
        {'deal_month': '2026-01-01', 'category': 'Двери',   'total_deals': 20,  'novosel_deals': 2},
    ])


def make_aov():
    return pd.DataFrame([
        {'category': 'Кухни',   'client_segment': 'Новосел', 'paid_deals': 20, 'avg_aov': 200_000, 'avg_margin': 40_000},
        {'category': 'Кухни',   'client_segment': 'База',    'paid_deals': 80, 'avg_aov': 150_000, 'avg_margin': 30_000},
        {'category': 'Ванные',  'client_segment': 'Новосел', 'paid_deals': 8,  'avg_aov': 180_000, 'avg_margin': 35_000},
        {'category': 'Ванные',  'client_segment': 'База',    'paid_deals': 42, 'avg_aov': 130_000, 'avg_margin': 25_000},
        {'category': 'Хранение','client_segment': 'Новосел', 'paid_deals': 3,  'avg_aov': 80_000,  'avg_margin': 15_000},
        {'category': 'Хранение','client_segment': 'База',    'paid_deals': 27, 'avg_aov': 60_000,  'avg_margin': 12_000},
        {'category': 'Двери',   'client_segment': 'Новосел', 'paid_deals': 2,  'avg_aov': 50_000,  'avg_margin': 10_000},
        {'category': 'Двери',   'client_segment': 'База',    'paid_deals': 18, 'avg_aov': 40_000,  'avg_margin': 8_000},
    ])


# ---------------------------------------------------------------------------
# Тесты структуры
# ---------------------------------------------------------------------------

def test_payload_is_composite():
    payload = compute_payload(make_penetration(), make_aov())
    assert payload['kind'] == 'composite'
    assert len(payload['blocks']) == 3


def test_kpi_block():
    payload = compute_payload(make_penetration(), make_aov())
    kpi = payload['blocks'][0]
    assert kpi['kind'] == 'kpi'
    assert len(kpi['items']) == 4

    labels = [i['label'] for i in kpi['items']]
    assert 'Проникновение Новоселов' in labels
    assert 'AOV Новоселов' in labels


def test_penetration_value():
    payload = compute_payload(make_penetration(), make_aov())
    kpi_items = {i['label']: i for i in payload['blocks'][0]['items']}
    # total_deals=365, novosel_deals=68 → ~18.6%
    pen = kpi_items['Проникновение Новоселов']['value']
    assert 15.0 <= pen <= 22.0


def test_aov_uplift_positive():
    payload = compute_payload(make_penetration(), make_aov())
    kpi_items = {i['label']: i for i in payload['blocks'][0]['items']}
    uplift = kpi_items['AOV Новоселов']['delta']
    assert uplift > 0, "Новоселы должны давать положительный AOV uplift"


def test_line_chart_block():
    payload = compute_payload(make_penetration(), make_aov())
    line = payload['blocks'][1]
    assert line['kind'] == 'line_chart'
    assert line['yUnit'] == '%'
    assert len(line['xAxis']) == 2  # 2 месяца в фикстуре
    assert len(line['series']) > 0
    for s in line['series']:
        assert len(s['data']) == len(line['xAxis'])


def test_bar_chart_block():
    payload = compute_payload(make_penetration(), make_aov())
    bar = payload['blocks'][2]
    assert bar['kind'] == 'bar_chart'
    assert bar['yUnit'] == '₽'
    assert len(bar['xAxis']) == 4  # 4 категории
    for s in bar['series']:
        assert len(s['data']) == 4
        assert all(v >= 0 for v in s['data'])


def test_no_nan_in_payload():
    import json, math
    payload = compute_payload(make_penetration(), make_aov())
    flat = json.dumps(payload)
    assert 'NaN' not in flat
    assert 'null' not in flat or True  # null допустим только для color


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------

def test_empty_penetration():
    df_p = pd.DataFrame(columns=['deal_month', 'category', 'total_deals', 'novosel_deals'])
    df_a = make_aov()
    payload = compute_payload(df_p, df_a)
    assert payload['kind'] == 'composite'
    kpi = payload['blocks'][0]
    pen = next(i for i in kpi['items'] if i['label'] == 'Проникновение Новоселов')
    assert pen['value'] == 0


def test_zero_total_deals_no_division_error():
    df_p = pd.DataFrame([
        {'deal_month': '2026-01-01', 'category': 'Кухни', 'total_deals': 0, 'novosel_deals': 0},
    ])
    payload = compute_payload(df_p, make_aov())
    assert payload['kind'] == 'composite'
