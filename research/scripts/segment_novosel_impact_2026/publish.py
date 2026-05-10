"""
research/scripts/segment_novosel_impact_2026/publish.py

Оркестратор: GP → analyze → Firestore (или _outbox fallback).
Запускать на рабочем ПК с активным VPN и настроенным research/.env

Использование:
    cd C:\\Users\\60110579\\Impact_calculator
    python research\\scripts\\segment_novosel_impact_2026\\publish.py
"""

from __future__ import annotations
import sys
import os
import json
import logging
from pathlib import Path
from datetime import datetime

# ── shared ────────────────────────────────────────────────────────────────────
RESEARCH_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(RESEARCH_ROOT / "shared"))

from gp_client import query_df  # noqa: E402
from analyze import (  # noqa: E402
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
)

# ── logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ── slug & version ────────────────────────────────────────────────────────────
SLUG    = "segment_novosel_impact_2026"
VERSION = "1.0.0"

# ── временные окна (меняй здесь, не в SQL) ────────────────────────────────────
DATE_FULL_START  = "2025-12-01"
DATE_FULL_END    = "2026-04-30"
DATE_2026_START  = "2026-01-01"
DATE_2026_END    = "2026-04-30"
DATE_KPI_END     = "2026-12-31"
YOY_START_25     = "2025-01-01"
YOY_END_25       = "2025-05-01"   # exclusive upper bound
YOY_START_26     = "2026-01-01"
YOY_END_26       = "2026-05-01"   # exclusive upper bound

BASE_PARAMS: dict = {
    "date_full_start":  DATE_FULL_START,
    "date_full_end":    DATE_FULL_END,
    "date_2026_start":  DATE_2026_START,
    "date_2026_end":    DATE_2026_END,
    "date_kpi_end":     DATE_KPI_END,
    "yoy_start_25":     YOY_START_25,
    "yoy_end_25":       YOY_END_25,
    "yoy_start_26":     YOY_START_26,
    "yoy_end_26":       YOY_END_26,
}

CATEGORIES = {
    "bathroom":     "Ванные комнаты",
    "kitchen":      "Кухни",
    "storage":      "Хранение",
    "interior_door": "Межкомнатные двери",
}


# ── SQL loader ────────────────────────────────────────────────────────────────

def _load_named_sql(name: str) -> str:
    """Extract a named query block from query.sql between '-- name: <name>' markers."""
    sql_path = Path(__file__).parent / "query.sql"
    text = sql_path.read_text(encoding="utf-8")
    blocks: dict[str, str] = {}
    current_name: str | None = None
    current_lines: list[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("-- name:"):
            if current_name:
                blocks[current_name] = "\n".join(current_lines).strip()
            current_name = stripped.split("-- name:", 1)[1].strip()
            current_lines = []
        elif current_name is not None:
            current_lines.append(line)
    if current_name:
        blocks[current_name] = "\n".join(current_lines).strip()

    if name not in blocks:
        raise KeyError(f"SQL block '{name}' not found in query.sql")
    return blocks[name]


# ── publish helpers ───────────────────────────────────────────────────────────

def _try_firebase(payload: dict) -> bool:
    """Attempt to publish via fb_publisher. Returns True on success."""
    try:
        from fb_publisher import publish  # type: ignore
        publish(SLUG, payload)
        return True
    except ImportError:
        log.warning("fb_publisher not available — skipping Firebase path")
        return False
    except Exception as exc:
        log.warning("Firebase publish failed: %s", exc)
        return False


def _fallback_outbox(payload: dict) -> None:
    """Save payload to _outbox/ for manual upload."""
    outbox = RESEARCH_ROOT / "_outbox"
    outbox.mkdir(exist_ok=True)
    out_file = outbox / f"{SLUG}.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2, default=str)
    log.info("Saved to outbox: %s", out_file)


# ── main ──────────────────────────────────────────────────────────────────────

def run() -> None:
    log.info("=== %s v%s ===", SLUG, VERSION)
    log.info("Date window: %s → %s", DATE_FULL_START, DATE_FULL_END)

    sections: dict[str, dict] = {}

    # --- EDA ---
    log.info("[1/10] EDA v_client_tags")
    df_tags = query_df(_load_named_sql("eda_tags"))
    sections["eda_tags"] = compute_eda(df_tags, "customer_mdm_tags_ods.v_client_tags")
    log.info("  rowCount=%d", sections["eda_tags"]["row_count"])

    log.info("[2/10] EDA v_presale_deals")
    df_deals_eda = query_df(_load_named_sql("eda_deals"))
    sections["eda_deals"] = compute_eda(df_deals_eda, "presales_project_all_marts.v_presale_deals")
    log.info("  rowCount=%d", sections["eda_deals"]["row_count"])

    # --- Deal-type heatmap ---
    log.info("[3/10] Deal type heatmap")
    df_hm = query_df(_load_named_sql("deal_type_heatmap"), BASE_PARAMS)
    sections["deal_type_heatmap"] = compute_deal_type_heatmap(df_hm)
    log.info("  heatmap shape: %s rows", len(df_hm))

    # --- Store dynamics (bathroom) ---
    log.info("[4/10] Store dynamics (bathroom)")
    df_store = query_df(_load_named_sql("store_dynamics_bathroom"), BASE_PARAMS)
    sections["store_dynamics_bathroom"] = compute_store_dynamics(df_store)
    log.info("  stores: %d", len(df_store["storeid"].unique()))

    # --- Category monthly dynamics ---
    log.info("[5/10] Category monthly dynamics + client segments")
    sections["category_dynamics"] = {}
    sections["client_segment_dynamics"] = {}
    for cat_key, cat_label in CATEGORIES.items():
        params = {**BASE_PARAMS, "category_pattern": f"%{cat_key}%"}

        df_cat = query_df(_load_named_sql("category_monthly_dynamics"), params)
        sections["category_dynamics"][cat_key] = compute_category_dynamics(df_cat, cat_label)

        df_seg = query_df(_load_named_sql("client_segment_dynamics"), params)
        sections["client_segment_dynamics"][cat_key] = compute_client_segment_dynamics(df_seg, cat_label)
        log.info("  %s: %d months", cat_label, len(df_cat))

    # --- A/B comparison ---
    log.info("[6/10] A/B comparison")
    df_ab = query_df(_load_named_sql("ab_comparison"), BASE_PARAMS)
    sections["ab_comparison"] = compute_ab_comparison(df_ab)
    log.info("  ab rows: %d", len(df_ab))

    # --- Frequency total ---
    log.info("[7/10] Frequency total")
    df_freq = query_df(_load_named_sql("frequency_total"), BASE_PARAMS)
    sections["frequency_total"] = compute_frequency_total(df_freq)
    log.info("  freq rows: %d", len(df_freq))

    # --- Kitchen AOV YoY ---
    log.info("[8/10] Kitchen AOV YoY")
    df_kitchen = query_df(_load_named_sql("kitchen_aov_yoy"), BASE_PARAMS)
    sections["kitchen_aov_yoy"] = compute_kitchen_aov_yoy(df_kitchen)
    log.info("  kitchen deals: 2025=%d 2026=%d",
             sections["kitchen_aov_yoy"]["raw_deals_2025"],
             sections["kitchen_aov_yoy"]["raw_deals_2026"])

    # --- Segment KPIs ---
    log.info("[9/10] Segment KPIs")
    df_nov  = query_df(_load_named_sql("kpi_novosel_2026"),  BASE_PARAMS)
    df_b26  = query_df(_load_named_sql("kpi_base_2026"),     BASE_PARAMS)
    df_b25  = query_df(_load_named_sql("kpi_base_2025"),     BASE_PARAMS)
    sections["segment_kpis"] = compute_segment_kpis(df_nov, df_b26, df_b25)
    log.info("  novosel_2026 clients=%d  base_2026 clients=%d  base_2025 clients=%d",
             sections["segment_kpis"]["novosel_2026"]["total_clients"],
             sections["segment_kpis"]["base_2026"]["total_clients"],
             sections["segment_kpis"]["base_2025"]["total_clients"])

    # --- Client clusters ---
    log.info("[10/10] Client clusters")
    df_clust = query_df(_load_named_sql("client_clusters"), BASE_PARAMS)
    sections["client_clusters"] = compute_client_clusters(df_clust)
    log.info("  cluster rows: %d", len(df_clust))

    # ── Sanity checks ──────────────────────────────────────────────────────────
    log.info("--- Sanity checks ---")
    nov_kpi  = sections["segment_kpis"]["novosel_2026"]
    base_kpi = sections["segment_kpis"]["base_2026"]
    assert nov_kpi["total_deals"] > 0,  "SANITY FAIL: novosel_2026 has 0 deals"
    assert base_kpi["total_deals"] > 0, "SANITY FAIL: base_2026 has 0 deals"
    assert 0 <= nov_kpi["conversion_pct"] <= 100,  "SANITY FAIL: conversion out of range"
    assert 0 <= base_kpi["conversion_pct"] <= 100, "SANITY FAIL: conversion out of range"
    log.info("  Sanity checks passed ✅")

    # ── Build final payload ────────────────────────────────────────────────────
    payload = {
        "slug":          SLUG,
        "version":       VERSION,
        "refreshed_at":  datetime.utcnow().isoformat() + "Z",
        "date_window":   {"start": DATE_FULL_START, "end": DATE_FULL_END},
        "sections":      sections,
    }

    # ── Publish ────────────────────────────────────────────────────────────────
    log.info("Publishing...")
    if not _try_firebase(payload):
        _fallback_outbox(payload)

    log.info("=== Done: %s ===", SLUG)


if __name__ == "__main__":
    run()
