"""pytest — синтетические тесты без подключения к GP."""
import pandas as pd
import pytest
from analyze import compute_payload


# ---------------------------------------------------------------------------
# Фикстуры
# ---------------------------------------------------------------------------

def make_df():
    """Реалистичные синтетические данные: 5 типов сделок × 5 месяцев."""
    rows = []
    types = [
        ('Kitchen_standard', 200),
        ('Bathroom_project', 80),
        ('Storage_solution', 60),
        ('Bedroom_project',  120),
    ]
    months = ['2025-12-01', '2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01']
    for deal_type, base_count in types:
        for i, month in enumerate(months):
            total = base_count + i * 5
            novosel = int(total * 0.15) + i
            rows.append({
                'deal_month':    month,
                'deal_type':     deal_type,
                'total_deals':   total,
                'novosel_deals': novosel,
            })
    # Rare_type: только 2 месяца с малыми объёмами → суммарно 17 сделок < 50
    rows.append({'deal_month': '2025-12-01', 'deal_type': 'Rare_type', 'total_deals': 8, 'novosel_deals': 1})
    rows.append({'deal_month': '2026-01-01', 'deal_type': 'Rare_type', 'total_deals': 9, 'novosel_deals': 1})
    return pd.DataFrame(rows)


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
    assert 'Проникновение Новоселов' in labels
    assert 'Максимальное проникновение' in labels
    assert 'Сделок с Новоселами' in labels
    assert 'Типов сделок в анализе' in labels


def test_penetration_value_in_range():
    payload = compute_payload(make_df())
    kpi_map = {i['label']: i['value'] for i in payload['blocks'][0]['items']}
    pen = kpi_map['Проникновение Новоселов']
    assert 5.0 <= pen <= 50.0


def test_max_penetration_gte_overall():
    payload = compute_payload(make_df())
    kpi_map = {i['label']: i['value'] for i in payload['blocks'][0]['items']}
    assert kpi_map['Максимальное проникновение'] >= kpi_map['Проникновение Новоселов']


# ---------------------------------------------------------------------------
# Heatmap table
# ---------------------------------------------------------------------------

def test_heatmap_block_structure():
    payload = compute_payload(make_df())
    htable = payload['blocks'][1]
    assert htable['kind'] == 'table'
    assert len(htable['columns']) > 1  # deal_type + месяцы
    assert htable['columns'][0]['key'] == 'deal_type'


def test_heatmap_excludes_rare_types():
    payload = compute_payload(make_df())
    htable = payload['blocks'][1]
    types_in_table = [r['deal_type'] for r in htable['rows']]
    assert 'Rare_type' not in types_in_table


def test_heatmap_includes_eligible_types():
    payload = compute_payload(make_df())
    htable = payload['blocks'][1]
    types_in_table = [r['deal_type'] for r in htable['rows']]
    assert 'Kitchen_standard' in types_in_table
    assert 'Bathroom_project' in types_in_table


def test_heatmap_values_are_percentages():
    payload = compute_payload(make_df())
    htable = payload['blocks'][1]
    for row in htable['rows']:
        for k, v in row.items():
            if k != 'deal_type':
                assert isinstance(v, float), f"Expected float for {k}"
                assert 0.0 <= v <= 100.0, f"Percent out of range: {v}"


# ---------------------------------------------------------------------------
# Detail table
# ---------------------------------------------------------------------------

def test_detail_block_structure():
    payload = compute_payload(make_df())
    dtable = payload['blocks'][2]
    assert dtable['kind'] == 'table'
    col_keys = [c['key'] for c in dtable['columns']]
    assert 'deal_month' in col_keys
    assert 'deal_type' in col_keys
    assert 'total_deals' in col_keys
    assert 'novosel_deals' in col_keys
    assert 'share_pct' in col_keys


def test_detail_only_kitchen_bathroom_storage():
    payload = compute_payload(make_df())
    dtable = payload['blocks'][2]
    for row in dtable['rows']:
        dt = row['deal_type'].lower()
        assert any(kw in dt for kw in ('kitchen', 'bathroom', 'storage')), \
            f"Unexpected deal_type in detail: {row['deal_type']}"


def test_detail_bedroom_excluded():
    payload = compute_payload(make_df())
    dtable = payload['blocks'][2]
    types = [r['deal_type'] for r in dtable['rows']]
    assert not any('bedroom' in t.lower() for t in types)


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------

def test_empty_dataframe():
    df = pd.DataFrame(columns=['deal_month', 'deal_type', 'total_deals', 'novosel_deals'])
    payload = compute_payload(df)
    assert payload['kind'] == 'composite'
    kpi_map = {i['label']: i['value'] for i in payload['blocks'][0]['items']}
    assert kpi_map['Проникновение Новоселов'] == 0.0


def test_zero_total_no_division_error():
    df = pd.DataFrame([{
        'deal_month': '2026-01-01', 'deal_type': 'Kitchen_standard',
        'total_deals': 0, 'novosel_deals': 0,
    }])
    payload = compute_payload(df)
    assert payload['kind'] == 'composite'


def test_no_nan_in_payload():
    import json
    payload = compute_payload(make_df())
    flat = json.dumps(payload)
    assert 'NaN' not in flat
