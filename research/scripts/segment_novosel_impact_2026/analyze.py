"""
research/scripts/segment_novosel_impact_2026/analyze.py

Pure transformation functions: DataFrames in → payload dicts out.
No I/O, no DB calls — unit-testable on synthetic data.
"""

from __future__ import annotations
import pandas as pd
import numpy as np
from typing import Any


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _month_ru(dt_series: pd.Series) -> pd.Series:
    m = {1: "Январь", 2: "Февраль", 3: "Март", 4: "Апрель",
         5: "Май", 6: "Июнь", 7: "Июль", 8: "Август",
         9: "Сентябрь", 10: "Октябрь", 11: "Ноябрь", 12: "Декабрь"}
    return pd.to_datetime(dt_series).dt.month.map(m)


def _safe_pct(num, den, scale=100.0):
    if den and den > 0:
        return round(num / den * scale, 2)
    return 0.0


def _kpi_summary(df: pd.DataFrame) -> dict:
    """Aggregate KPI DataFrame to totals dict."""
    t_clients  = int(df["count_clients"].sum())
    t_deals    = int(df["count_deals"].sum())
    t_paid     = int(df["count_paid_deals"].sum())
    t_budget   = float(df["total_budget"].sum())
    t_margin   = float(df["total_margin"].sum())
    return {
        "total_clients":       t_clients,
        "total_deals":         t_deals,
        "total_paid_deals":    t_paid,
        "total_budget":        round(t_budget, 2),
        "total_margin":        round(t_margin, 2),
        "deals_per_client":    round(t_deals / t_clients, 3) if t_clients else 0.0,
        "conversion_pct":      _safe_pct(t_paid, t_deals),
        "aov":                 round(t_budget / t_paid, 2) if t_paid else 0.0,
        "margin_rate_pct":     _safe_pct(t_margin, t_budget),
    }


# ---------------------------------------------------------------------------
# Q1/Q2 — EDA
# ---------------------------------------------------------------------------

def compute_eda(df: pd.DataFrame, table_name: str) -> dict[str, Any]:
    """Return basic EDA stats for a table sample."""
    return {
        "kind":       "eda",
        "table":      table_name,
        "row_count":  len(df),
        "col_count":  len(df.columns),
        "columns":    list(df.columns),
        "null_counts": df.isnull().sum().to_dict(),
        "dtypes":     {c: str(t) for c, t in df.dtypes.items()},
    }


# ---------------------------------------------------------------------------
# Q3 — Тепловая карта deal_type × month
# ---------------------------------------------------------------------------

def compute_deal_type_heatmap(df: pd.DataFrame) -> dict[str, Any]:
    """Heatmap payload: novosel_share by deal_type and month."""
    df = df.copy()
    df["deal_month"] = pd.to_datetime(df["deal_month"])
    df["month_str"]  = df["deal_month"].dt.strftime("%Y-%m")
    df["total_deals"]   = pd.to_numeric(df["total_deals"])
    df["novosel_deals"] = pd.to_numeric(df["novosel_deals"])
    df["share_pct"] = df.apply(
        lambda r: _safe_pct(r["novosel_deals"], r["total_deals"]), axis=1
    )
    df["clean_type"] = df["deal_type"].str.replace("_", " ").str.capitalize()

    # Filter noise: keep deal_types with >= 50 total deals across all months
    type_totals = df.groupby("deal_type")["total_deals"].sum()
    keep = type_totals[type_totals >= 50].index
    df = df[df["deal_type"].isin(keep)]

    pivot = (
        df.pivot_table(index="clean_type", columns="month_str",
                       values="share_pct", aggfunc="mean", fill_value=0)
        .round(2)
    )

    return {
        "kind":    "heatmap",
        "title":   "Доля новосёлов по типу сделки и месяцу, %",
        "x_axis":  list(pivot.columns),
        "y_axis":  list(pivot.index),
        "matrix":  pivot.values.tolist(),
        "raw_rows": len(df),
    }


# ---------------------------------------------------------------------------
# Q4 — Динамика магазинов (ванные)
# ---------------------------------------------------------------------------

def compute_store_dynamics(df: pd.DataFrame) -> dict[str, Any]:
    """Store-level novosel share pivot (months as columns)."""
    df = df.copy()
    df["month"] = pd.to_datetime(df["month"])
    df["novosel_share"] = pd.to_numeric(df["novosel_share"])

    pivot = (
        df.pivot_table(index="storeid", columns="month",
                       values="novosel_share", fill_value=0)
        .round(2)
        .reset_index()
    )
    pivot.columns = [
        str(c.strftime("%Y-%m")) if isinstance(c, pd.Timestamp) else str(c)
        for c in pivot.columns
    ]

    return {
        "kind":   "table",
        "title":  "Доля новосёлов по магазинам (категория «Ванные»), %",
        "stores": pivot["storeid"].tolist(),
        "months": [c for c in pivot.columns if c != "storeid"],
        "rows":   pivot.drop(columns=["storeid"]).values.tolist(),
    }


# ---------------------------------------------------------------------------
# Q5 — Ежемесячная динамика по категории
# ---------------------------------------------------------------------------

def compute_category_dynamics(df: pd.DataFrame, category_label: str) -> dict[str, Any]:
    """Monthly novosel share for a single category."""
    df = df.copy()
    df["month"] = pd.to_datetime(df["month"])
    df["total_deals"]   = pd.to_numeric(df["total_deals"])
    df["novosel_deals"] = pd.to_numeric(df["novosel_deals"])
    df["novosel_share"] = pd.to_numeric(df["novosel_share"])
    df["month_name"]    = _month_ru(df["month"]) + " " + df["month"].dt.year.astype(str)

    return {
        "kind":            "line_chart",
        "category":        category_label,
        "title":           f"Доля новосёлов — {category_label} (Янв–Апр 2026)",
        "months":          df["month_name"].tolist(),
        "total_deals":     df["total_deals"].tolist(),
        "novosel_deals":   df["novosel_deals"].tolist(),
        "novosel_share":   df["novosel_share"].round(2).tolist(),
    }


# ---------------------------------------------------------------------------
# Q6 — Динамика клиентов по сегменту и категории
# ---------------------------------------------------------------------------

def compute_client_segment_dynamics(df: pd.DataFrame, category_label: str) -> dict[str, Any]:
    """Unique clients per month split by Novosel / База."""
    df = df.copy()
    df["month"]         = pd.to_datetime(df["month"])
    df["clients_count"] = pd.to_numeric(df["clients_count"])
    df["month_name"]    = _month_ru(df["month"]) + " " + df["month"].dt.year.astype(str)

    segments = df["segment"].unique().tolist()
    result: dict[str, list] = {s: [] for s in segments}
    months_list: list[str] = []

    for _, grp in df.groupby("month_name", sort=False):
        if not months_list:
            pass
        months_list.append(grp["month_name"].iloc[0])
        seg_vals = grp.set_index("segment")["clients_count"].to_dict()
        for s in segments:
            result[s].append(int(seg_vals.get(s, 0)))

    months_sorted = df.drop_duplicates("month_name").sort_values("month")["month_name"].tolist()
    result_sorted: dict[str, list] = {}
    for s in segments:
        result_sorted[s] = []
    for m in months_sorted:
        sub = df[df["month_name"] == m]
        seg_vals = sub.set_index("segment")["clients_count"].to_dict()
        for s in segments:
            result_sorted[s].append(int(seg_vals.get(s, 0)))

    return {
        "kind":     "line_chart",
        "category": category_label,
        "title":    f"Уникальные клиенты — {category_label} (Янв–Апр 2026)",
        "months":   months_sorted,
        "series":   result_sorted,
    }


# ---------------------------------------------------------------------------
# Q7 — A/B сравнение
# ---------------------------------------------------------------------------

def compute_ab_comparison(df: pd.DataFrame) -> dict[str, Any]:
    """A/B: Новосел vs Не Новосел по макрокатегориям."""
    df = df.copy()
    df["total_deals"]   = pd.to_numeric(df["total_deals"])
    df["paid_deals"]    = pd.to_numeric(df["paid_deals"])
    df["total_revenue"] = pd.to_numeric(df["total_revenue"])

    def _macro(val: str) -> str:
        v = str(val).lower()
        if "kitchen"  in v: return "Kitchen"
        if "bathroom" in v: return "Bathroom"
        if "storage"  in v: return "Storage"
        return "Other"

    df["macro_category"] = df["deal_type"].apply(_macro)
    df["deal_month"]     = pd.to_datetime(df["deal_month"])

    agg = (
        df.groupby(["macro_category", "client_segment"])
        .agg(
            total_deals=("total_deals", "sum"),
            paid_deals=("paid_deals", "sum"),
            total_revenue=("total_revenue", "sum"),
        )
        .reset_index()
    )
    agg["conversion_pct"] = agg.apply(
        lambda r: _safe_pct(r["paid_deals"], r["total_deals"]), axis=1
    )
    agg["aov"] = agg.apply(
        lambda r: round(r["total_revenue"] / r["paid_deals"], 2) if r["paid_deals"] else 0.0,
        axis=1,
    )

    return {
        "kind":  "table",
        "title": "A/B сравнение: Новосел vs Не Новосел по категориям",
        "rows":  agg.to_dict(orient="records"),
    }


# ---------------------------------------------------------------------------
# Q8 — Общая частотность
# ---------------------------------------------------------------------------

def compute_frequency_total(df: pd.DataFrame) -> dict[str, Any]:
    """Avg deals and paid deals per client by month and segment."""
    df = df.copy()
    df["deal_month"]    = pd.to_datetime(df["deal_month"])
    df["unique_clients"] = pd.to_numeric(df["unique_clients"])
    df["total_deals"]    = pd.to_numeric(df["total_deals"])
    df["paid_deals"]     = pd.to_numeric(df["paid_deals"])
    df["month_str"]      = df["deal_month"].dt.strftime("%Y-%m")
    df["avg_deals_per_client"] = np.where(
        df["unique_clients"] > 0, df["total_deals"] / df["unique_clients"], 0
    ).round(3)
    df["avg_paid_per_client"] = np.where(
        df["unique_clients"] > 0, df["paid_deals"] / df["unique_clients"], 0
    ).round(3)

    return {
        "kind":  "table",
        "title": "Частотность: сделки на клиента по сегменту",
        "rows":  df[["month_str", "client_segment", "unique_clients",
                      "total_deals", "paid_deals",
                      "avg_deals_per_client", "avg_paid_per_client"]]
                 .to_dict(orient="records"),
    }


# ---------------------------------------------------------------------------
# Q9 — Kitchen AOV год-к-году
# ---------------------------------------------------------------------------

def compute_kitchen_aov_yoy(df: pd.DataFrame) -> dict[str, Any]:
    """AOV and revenue for kitchen YoY (Jan–Apr 2025 vs 2026)."""
    df = df.copy()
    df = df[df["period_year"].notna()]
    df["revenue"]    = pd.to_numeric(df["revenue"])
    df["month_num"]  = pd.to_numeric(df["month_num"])

    month_names = {1: "1. Январь", 2: "2. Февраль", 3: "3. Март", 4: "4. Апрель"}
    df["month_name"] = df["month_num"].map(month_names)

    agg = (
        df.groupby(["period_year", "month_name"])
        .agg(revenue=("revenue", "sum"), deals=("deal_id", "nunique"))
        .reset_index()
    )
    agg["aov"] = (agg["revenue"] / agg["deals"]).round(2)

    pivot = agg.pivot(index="month_name", columns="period_year", values="aov").fillna(0)
    if "2025" in pivot.columns and "2026" in pivot.columns:
        pivot["delta_pct"] = ((pivot["2026"] - pivot["2025"]) / pivot["2025"].replace(0, np.nan) * 100).round(1)

    return {
        "kind":  "table",
        "title": "AOV по Кухням год-к-году (Янв–Апр)",
        "rows":  pivot.reset_index().to_dict(orient="records"),
        "raw_deals_2025": int(agg[agg["period_year"] == "2025"]["deals"].sum()),
        "raw_deals_2026": int(agg[agg["period_year"] == "2026"]["deals"].sum()),
    }


# ---------------------------------------------------------------------------
# Q11/Q12/Q13 — KPI-профиль сегмента
# ---------------------------------------------------------------------------

def compute_segment_kpis(
    df_novosel_2026: pd.DataFrame,
    df_base_2026:    pd.DataFrame,
    df_base_2025:    pd.DataFrame,
) -> dict[str, Any]:
    """Consolidated KPI summary for all three cohorts."""
    return {
        "kind":           "kpi",
        "title":          "Сравнение KPI: Новосел 2026 / База 2026 / База 2025",
        "novosel_2026":   _kpi_summary(df_novosel_2026),
        "base_2026":      _kpi_summary(df_base_2026),
        "base_2025":      _kpi_summary(df_base_2025),
    }


# ---------------------------------------------------------------------------
# Q14 — Поведенческие кластеры
# ---------------------------------------------------------------------------

def _assign_cluster(paid: int) -> str:
    if paid == 0:  return "1. Нет оплат (Отвал)"
    if paid == 1:  return "2. Ровно 1 оплаченный проект"
    if paid == 2:  return "3. Ровно 2 оплаченных проекта"
    return "4. От 3 и более (Комплексный)"


def compute_client_clusters(df: pd.DataFrame) -> dict[str, Any]:
    """Behavioral clusters by payment count YoY."""
    df = df.copy()
    df = df[df["period"].notna()]
    df["paid_deals"] = pd.to_numeric(df["paid_deals"])
    df["gmv"]        = pd.to_numeric(df["gmv"])
    df["margin"]     = pd.to_numeric(df["margin"])
    df["cluster"]    = df["paid_deals"].apply(_assign_cluster)

    agg = (
        df.groupby(["period", "cluster"])
        .agg(
            clients=("client_id", "nunique"),
            total_gmv=("gmv", "sum"),
        )
        .reset_index()
    )
    agg["total_gmv"] = agg["total_gmv"].round(2)

    # Share within period
    period_totals = agg.groupby("period")["clients"].transform("sum")
    agg["share_pct"] = (agg["clients"] / period_totals * 100).round(2)

    return {
        "kind":  "table",
        "title": "Поведенческие кластеры клиентов (Янв–Апр 2025 vs 2026)",
        "rows":  agg.to_dict(orient="records"),
    }
