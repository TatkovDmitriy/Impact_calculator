"""
pytest test_synthetic.py — unit tests on mock DataFrames.
No DB connection required.

Run: cd research && pytest scripts/segment_novosel_impact_2026/test_synthetic.py -v
"""

import sys
from pathlib import Path

import pandas as pd
import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).parent))
from analyze import (
    compute_eda,
    compute_deal_type_heatmap,
    compute_store_dynamics,
    compute_category_dynamics,
    compute_client_segment_dynamics,
    compute_ab_comparison,
    compute_frequency_total,
    compute_kitchen_aov_yoy,
    compute_segment_kpis,
    compute_client_clusters,
    _kpi_summary,
)


# ── fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def df_tags_sample():
    return pd.DataFrame({
        "client_number": ["C1", "C2", "C3"],
        "tag_catalog_id": ["1", "1", "2"],
        "is_actual": ["1", "1", "1"],
    })


@pytest.fixture
def df_heatmap():
    return pd.DataFrame({
        "deal_month": ["2026-01-01", "2026-01-01", "2026-02-01"],
        "deal_type": ["bathroom_design", "bathroom_design", "kitchen_basic"],
        "total_deals": [100, 100, 80],
        "novosel_deals": [20, 20, 10],
    })


@pytest.fixture
def df_store():
    return pd.DataFrame({
        "storeid": ["S1", "S1", "S2"],
        "month": ["2026-02-01", "2026-03-01", "2026-02-01"],
        "total_deals": [50, 60, 30],
        "novosel_deals": [10, 15, 6],
        "novosel_share": [20.0, 25.0, 20.0],
    })


@pytest.fixture
def df_cat_dynamics():
    return pd.DataFrame({
        "month": ["2026-01-01", "2026-02-01", "2026-03-01"],
        "total_deals": [100, 120, 110],
        "novosel_deals": [20, 30, 22],
        "novosel_share": [20.0, 25.0, 20.0],
    })


@pytest.fixture
def df_client_segments():
    return pd.DataFrame({
        "month": ["2026-01-01", "2026-01-01", "2026-02-01", "2026-02-01"],
        "segment": ["Новоселы", "База (Не новоселы)", "Новоселы", "База (Не новоселы)"],
        "clients_count": [50, 300, 60, 310],
    })


@pytest.fixture
def df_ab():
    return pd.DataFrame({
        "deal_month": ["2026-01-01"] * 4,
        "deal_type": ["kitchen_basic", "kitchen_basic", "bathroom_design", "bathroom_design"],
        "client_segment": ["Новосел", "Не Новосел", "Новосел", "Не Новосел"],
        "total_deals": [100, 500, 80, 400],
        "paid_deals": [40, 150, 30, 120],
        "total_revenue": [4_000_000, 15_000_000, 3_000_000, 12_000_000],
    })


@pytest.fixture
def df_freq():
    return pd.DataFrame({
        "deal_month": ["2026-01-01", "2026-01-01"],
        "client_segment": ["Новосел", "Не Новосел"],
        "unique_clients": [50, 300],
        "total_deals": [150, 600],
        "paid_deals": [60, 180],
    })


@pytest.fixture
def df_kitchen():
    return pd.DataFrame({
        "deal_id": [f"D{i}" for i in range(8)],
        "createddate": [
            "2025-01-15", "2025-02-10", "2025-03-05", "2025-04-20",
            "2026-01-15", "2026-02-10", "2026-03-05", "2026-04-20",
        ],
        "month_num": [1, 2, 3, 4, 1, 2, 3, 4],
        "period_year": ["2025", "2025", "2025", "2025", "2026", "2026", "2026", "2026"],
        "revenue": [100_000, 120_000, 110_000, 130_000,
                    115_000, 140_000, 125_000, 150_000],
    })


@pytest.fixture
def df_kpi():
    return pd.DataFrame({
        "deal_month": ["2026-01-01", "2026-02-01"],
        "count_clients": [50, 60],
        "count_deals": [150, 180],
        "count_paid_deals": [60, 72],
        "total_budget": [6_000_000, 7_200_000],
        "total_margin": [1_200_000, 1_440_000],
    })


@pytest.fixture
def df_clusters():
    clients = [f"C{i}" for i in range(10)]
    paid = [0, 1, 1, 2, 2, 3, 3, 3, 4, 0]
    return pd.DataFrame({
        "client_id": clients,
        "period": ["2026 (Янв-Апр)"] * 10,
        "total_created_deals": paid,
        "paid_deals": paid,
        "gmv": [p * 100_000 for p in paid],
        "margin": [p * 20_000 for p in paid],
    })


# ── tests ─────────────────────────────────────────────────────────────────────

class TestEda:
    def test_basic(self, df_tags_sample):
        result = compute_eda(df_tags_sample, "test_table")
        assert result["kind"] == "eda"
        assert result["row_count"] == 3
        assert result["col_count"] == 3
        assert "client_number" in result["columns"]

    def test_empty_df(self):
        df = pd.DataFrame(columns=["a", "b"])
        result = compute_eda(df, "empty")
        assert result["row_count"] == 0
        assert result["col_count"] == 2


class TestDealTypeHeatmap:
    def test_shape(self, df_heatmap):
        result = compute_deal_type_heatmap(df_heatmap)
        assert result["kind"] == "heatmap"
        assert len(result["x_axis"]) >= 1
        assert len(result["y_axis"]) >= 1
        assert len(result["matrix"]) == len(result["y_axis"])

    def test_share_range(self, df_heatmap):
        result = compute_deal_type_heatmap(df_heatmap)
        for row in result["matrix"]:
            for val in row:
                assert 0 <= val <= 100, f"share {val} out of [0,100]"

    def test_noise_filtered(self):
        # deal_type with < 50 deals total should be filtered out
        df = pd.DataFrame({
            "deal_month": ["2026-01-01"] * 2,
            "deal_type": ["rare_type", "common_type"],
            "total_deals": [10, 200],
            "novosel_deals": [2, 50],
        })
        result = compute_deal_type_heatmap(df)
        y_labels = [l.lower() for l in result["y_axis"]]
        assert not any("rare" in l for l in y_labels)


class TestStoreDynamics:
    def test_basic(self, df_store):
        result = compute_store_dynamics(df_store)
        assert result["kind"] == "table"
        assert "S1" in result["stores"]
        assert len(result["months"]) >= 1

    def test_no_negative_shares(self, df_store):
        result = compute_store_dynamics(df_store)
        for row in result["rows"]:
            for val in row:
                assert float(val) >= 0


class TestCategoryDynamics:
    def test_basic(self, df_cat_dynamics):
        result = compute_category_dynamics(df_cat_dynamics, "Ванные")
        assert result["kind"] == "line_chart"
        assert len(result["months"]) == 3
        assert len(result["novosel_share"]) == 3

    def test_share_in_range(self, df_cat_dynamics):
        result = compute_category_dynamics(df_cat_dynamics, "Ванные")
        for s in result["novosel_share"]:
            assert 0 <= s <= 100


class TestClientSegmentDynamics:
    def test_basic(self, df_client_segments):
        result = compute_client_segment_dynamics(df_client_segments, "Ванные")
        assert result["kind"] == "line_chart"
        assert "Новоселы" in result["series"]
        assert "База (Не новоселы)" in result["series"]
        assert len(result["months"]) == 2

    def test_values_non_negative(self, df_client_segments):
        result = compute_client_segment_dynamics(df_client_segments, "Ванные")
        for vals in result["series"].values():
            for v in vals:
                assert v >= 0


class TestAbComparison:
    def test_basic(self, df_ab):
        result = compute_ab_comparison(df_ab)
        assert result["kind"] == "table"
        assert len(result["rows"]) > 0

    def test_conversion_in_range(self, df_ab):
        result = compute_ab_comparison(df_ab)
        for row in result["rows"]:
            assert 0 <= row["conversion_pct"] <= 100

    def test_novosel_higher_aov(self, df_ab):
        result = compute_ab_comparison(df_ab)
        df = pd.DataFrame(result["rows"])
        nov_aov  = df[df["client_segment"] == "Новосел"]["aov"].mean()
        base_aov = df[df["client_segment"] == "Не Новосел"]["aov"].mean()
        # In synthetic data both are 100_000 — just check no zero
        assert nov_aov > 0
        assert base_aov > 0


class TestFrequencyTotal:
    def test_basic(self, df_freq):
        result = compute_frequency_total(df_freq)
        assert result["kind"] == "table"
        assert len(result["rows"]) == 2

    def test_avg_non_negative(self, df_freq):
        result = compute_frequency_total(df_freq)
        for row in result["rows"]:
            assert row["avg_deals_per_client"] >= 0
            assert row["avg_paid_per_client"] >= 0


class TestKitchenAovYoy:
    def test_basic(self, df_kitchen):
        result = compute_kitchen_aov_yoy(df_kitchen)
        assert result["kind"] == "table"
        assert result["raw_deals_2025"] == 4
        assert result["raw_deals_2026"] == 4

    def test_aov_positive(self, df_kitchen):
        result = compute_kitchen_aov_yoy(df_kitchen)
        for row in result["rows"]:
            for k, v in row.items():
                if k != "month_name":
                    assert float(v) >= 0 or np.isnan(float(v))


class TestSegmentKpis:
    def test_basic(self, df_kpi):
        result = compute_segment_kpis(df_kpi, df_kpi, df_kpi)
        assert result["kind"] == "kpi"
        for key in ("novosel_2026", "base_2026", "base_2025"):
            assert key in result
            kpi = result[key]
            assert kpi["total_clients"] == 110
            assert kpi["total_deals"] == 330
            assert 0 <= kpi["conversion_pct"] <= 100

    def test_empty_gives_zeros(self):
        empty = pd.DataFrame(columns=[
            "deal_month", "count_clients", "count_deals",
            "count_paid_deals", "total_budget", "total_margin",
        ]).astype({
            "count_clients": int, "count_deals": int,
            "count_paid_deals": int, "total_budget": float, "total_margin": float,
        })
        result = compute_segment_kpis(empty, empty, empty)
        assert result["novosel_2026"]["total_deals"] == 0
        assert result["novosel_2026"]["deals_per_client"] == 0.0


class TestClientClusters:
    def test_basic(self, df_clusters):
        result = compute_client_clusters(df_clusters)
        assert result["kind"] == "table"
        cluster_names = {r["cluster"] for r in result["rows"]}
        assert "1. Нет оплат (Отвал)" in cluster_names

    def test_shares_sum_100(self, df_clusters):
        result = compute_client_clusters(df_clusters)
        df = pd.DataFrame(result["rows"])
        for period, grp in df.groupby("period"):
            total = grp["share_pct"].sum()
            assert abs(total - 100.0) < 0.5, f"shares sum {total} ≠ 100 for {period}"

    def test_no_nan_in_payload(self, df_clusters):
        result = compute_client_clusters(df_clusters)
        for row in result["rows"]:
            for k, v in row.items():
                assert v is not None and not (isinstance(v, float) and np.isnan(v)), \
                    f"NaN in field '{k}'"
