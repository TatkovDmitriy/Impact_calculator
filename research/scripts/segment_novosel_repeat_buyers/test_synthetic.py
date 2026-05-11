"""pytest — синтетические тесты без подключения к GP."""
import pandas as pd
import pytest
from analyze import compute_payload


# ---------------------------------------------------------------------------
# Фикстуры
# ---------------------------------------------------------------------------

def make_df():
    """Реалистичные синтетические данные: 2 сегмента × 5 месяцев."""
    rows = []
    months = ['2025-12', '2026-01', '2026-02', '2026-03', '2026-04']
    # Новоселы: повышенная частота оплат
    nov_clients = [120, 130, 125, 140, 135]
    nov_paid    = [180, 200, 190, 220, 210]  # avg ~1.5
    nov_created = [360, 400, 380, 440, 420]
    # База: ниже частота
    base_clients = [800, 820, 810, 850, 840]
    base_paid    = [900, 950, 920, 990, 970]  # avg ~1.15
    base_created = [2000, 2100, 2050, 2200, 2150]

    for i, m in enumerate(months):
        rows.append({
            'deal_month': m, 'client_segment': 'Новосел',
            'unique_clients': nov_clients[i], 'total_deals': nov_created[i], 'paid_deals': nov_paid[i],
        })
        rows.append({
            'deal_month': m, 'client_segment': 'Не Новосел',
            'unique_clients': base_clients[i], 'total_deals': base_created[i], 'paid_deals': base_paid[i],
        })
    return pd.DataFrame(rows)


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
    assert 'Сред. оплаченных проектов (Новосел)' in labels
    assert 'Сред. оплаченных проектов (База)' in labels
    assert 'Уникальных клиентов-Новоселов' in labels
    assert 'Месяцев в анализе' in labels


def test_novosel_avg_gt_base():
    payload = compute_payload(make_df())
    kpi_map = {i['label']: i['value'] for i in payload['blocks'][0]['items']}
    assert kpi_map['Сред. оплаченных проектов (Новосел)'] > kpi_map['Сред. оплаченных проектов (База)']


def test_kpi_months_count():
    payload = compute_payload(make_df())
    kpi_map = {i['label']: i['value'] for i in payload['blocks'][0]['items']}
    assert kpi_map['Месяцев в анализе'] == 5


def test_delta_in_kpi():
    payload = compute_payload(make_df())
    kpi = payload['blocks'][0]
    first = kpi['items'][0]
    assert 'delta' in first
    assert isinstance(first['delta'], float)


# ---------------------------------------------------------------------------
# Line chart
# ---------------------------------------------------------------------------

def test_line_chart_structure():
    payload = compute_payload(make_df())
    lc = payload['blocks'][1]
    assert lc['kind'] == 'line_chart'
    assert len(lc['series']) == 2
    assert lc['yUnit'] == 'шт/клиент'


def test_line_chart_series_names():
    payload = compute_payload(make_df())
    lc = payload['blocks'][1]
    names = [s['name'] for s in lc['series']]
    assert 'Новосел' in names
    assert 'Не Новосел' in names


def test_line_chart_x_axis_len():
    payload = compute_payload(make_df())
    lc = payload['blocks'][1]
    assert len(lc['xAxis']) == 5
    for s in lc['series']:
        assert len(s['data']) == 5


def test_line_chart_values_positive():
    payload = compute_payload(make_df())
    lc = payload['blocks'][1]
    for s in lc['series']:
        for v in s['data']:
            assert v >= 0.0


# ---------------------------------------------------------------------------
# Table
# ---------------------------------------------------------------------------

def test_table_block_structure():
    payload = compute_payload(make_df())
    tbl = payload['blocks'][2]
    assert tbl['kind'] == 'table'
    col_keys = [c['key'] for c in tbl['columns']]
    assert 'deal_month' in col_keys
    assert 'nov_clients' in col_keys
    assert 'nov_avg_paid' in col_keys
    assert 'base_avg_paid' in col_keys
    assert 'premium_pct' in col_keys


def test_table_row_count():
    payload = compute_payload(make_df())
    tbl = payload['blocks'][2]
    assert len(tbl['rows']) == 5


def test_table_has_total_row():
    payload = compute_payload(make_df())
    tbl = payload['blocks'][2]
    assert 'totalRow' in tbl
    assert tbl['totalRow']['deal_month'] == 'ИТОГО / СРЕДн'


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------

def test_empty_dataframe():
    df = pd.DataFrame(columns=['deal_month', 'client_segment', 'unique_clients', 'total_deals', 'paid_deals'])
    payload = compute_payload(df)
    assert payload['kind'] == 'composite'
    kpi_map = {i['label']: i['value'] for i in payload['blocks'][0]['items']}
    assert kpi_map['Сред. оплаченных проектов (Новосел)'] == 0.0


def test_zero_clients_no_division_error():
    df = pd.DataFrame([{
        'deal_month': '2026-01', 'client_segment': 'Новосел',
        'unique_clients': 0, 'total_deals': 0, 'paid_deals': 0,
    }])
    payload = compute_payload(df)
    assert payload['kind'] == 'composite'


def test_no_nan_in_payload():
    import json
    payload = compute_payload(make_df())
    flat = json.dumps(payload)
    assert 'NaN' not in flat


def test_only_novosel_segment():
    rows = [{'deal_month': '2026-01', 'client_segment': 'Новосел',
             'unique_clients': 50, 'total_deals': 80, 'paid_deals': 70}]
    df = pd.DataFrame(rows)
    payload = compute_payload(df)
    assert payload['kind'] == 'composite'
    kpi_map = {i['label']: i['value'] for i in payload['blocks'][0]['items']}
    assert kpi_map['Уникальных клиентов-Новоселов'] == 50
