"""
research/scripts/deal_type_analysis/run.py
Pilot R1 — Анализ сделок по типу (deal_type)
Источник: presales_project_all_marts.v_presale_deals (Greenplum)
"""

SCRIPT_SLUG = "deal_type_analysis"

import sys
import os
from pathlib import Path
from datetime import datetime

import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots

# ── путь к shared ──────────────────────────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "shared"))
from gp_client import query_df

OUTPUT_DIR = Path(__file__).parent.parent.parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)
OUTPUT_HTML = OUTPUT_DIR / "deal_type_dashboard.html"


# === 1. ЦЕЛЬ ===================================================================
#
# Вопрос: сколько уникальных сделок (project_reference_id) по каждому
# типу deal_type в витрине presales_project_all_marts.v_presale_deals?
#
# Ожидаемый результат: bar chart + pie chart с фильтрацией по периоду.
# ===============================================================================


# === 2. ПОДКЛЮЧЕНИЕ И ДАННЫЕ ===================================================

SQL = """
SELECT
    COALESCE(deal_type, '[не указан]') AS deal_type,
    DATE_TRUNC('month', createddate)::date AS month,
    COUNT(DISTINCT project_reference_id)   AS deal_count
FROM presales_project_all_marts.v_presale_deals
WHERE createddate >= '2024-01-01'
GROUP BY 1, 2
ORDER BY 2, 1
"""

print("Подключение к Greenplum...")
df_raw = query_df(SQL)
print(f"Получено строк: {len(df_raw)}")


# === 3. ПЕРВИЧНЫЙ АНАЛИЗ =======================================================

print("\n── Структура данных ──")
print(f"Shape:   {df_raw.shape}")
print(f"Dtypes:\n{df_raw.dtypes}")
print(f"\nNulls:\n{df_raw.isnull().sum()}")
print(f"\nПервые 5 строк:\n{df_raw.head()}")

df_raw["month"] = pd.to_datetime(df_raw["month"])
df_raw["deal_count"] = pd.to_numeric(df_raw["deal_count"])


# === 4. ОСНОВНОЙ АНАЛИЗ ========================================================

# Периоды для фильтра
PERIODS = {
    "Последние 3 мес.": 3,
    "Последние 6 мес.": 6,
    "2025 год":         None,   # особый случай — год
    "Всё время":        999,
}

def aggregate_period(df: pd.DataFrame, months: int | None, label: str) -> pd.DataFrame:
    if label == "2025 год":
        sub = df[df["month"].dt.year == 2025]
    elif months >= 999:
        sub = df
    else:
        cutoff = df["month"].max() - pd.DateOffset(months=months)
        sub = df[df["month"] >= cutoff]
    result = (
        sub.groupby("deal_type", as_index=False)["deal_count"]
        .sum()
        .sort_values("deal_count", ascending=False)
    )
    result["pct"] = (result["deal_count"] / result["deal_count"].sum() * 100).round(1)
    return result

period_data = {
    label: aggregate_period(df_raw, months, label)
    for label, months in PERIODS.items()
}

# Sanity check
for label, agg in period_data.items():
    print(f"\n── {label}: {agg['deal_count'].sum():,} сделок, {len(agg)} типов ──")
    print(agg.to_string(index=False))


# === 5. ВИЗУАЛИЗАЦИЯ ===========================================================

LP_YELLOW = "#FDC300"
LP_DARK   = "#2F3738"
LP_MUTED  = "#6b7280"
LP_BG     = "#f9fafb"

first_label = list(PERIODS.keys())[0]
first_df    = period_data[first_label]

fig = make_subplots(
    rows=1, cols=2,
    column_widths=[0.62, 0.38],
    specs=[[{"type": "bar"}, {"type": "pie"}]],
    subplot_titles=["Количество сделок по типу", "Доля типов"],
)

# — собираем traces для каждого периода —
for i, (label, agg) in enumerate(period_data.items()):
    visible = i == 0
    total = agg["deal_count"].sum()

    # Bar chart
    fig.add_trace(
        go.Bar(
            x=agg["deal_type"],
            y=agg["deal_count"],
            name=label,
            visible=visible,
            marker_color=LP_YELLOW,
            marker_line_color=LP_DARK,
            marker_line_width=0.5,
            customdata=agg[["pct"]].values,
            hovertemplate=(
                "<b>%{x}</b><br>"
                "Сделок: <b>%{y:,}</b><br>"
                "Доля: %{customdata[0]:.1f}%<br>"
                f"Итого: {total:,}"
                "<extra></extra>"
            ),
        ),
        row=1, col=1,
    )

    # Pie chart
    fig.add_trace(
        go.Pie(
            labels=agg["deal_type"],
            values=agg["deal_count"],
            name=label,
            visible=visible,
            hole=0.35,
            marker_colors=[LP_YELLOW, LP_DARK, "#9ca3af", "#d1d5db",
                           "#374151", "#6b7280", "#f3f4f6", "#1f2937"],
            textinfo="percent",
            textfont_size=11,
            hovertemplate=(
                "<b>%{label}</b><br>"
                "Сделок: <b>%{value:,}</b><br>"
                "Доля: %{percent:.1f}"
                "<extra></extra>"
            ),
        ),
        row=1, col=2,
    )

# — кнопки фильтра —
n = len(PERIODS)
buttons = []
for i, label in enumerate(PERIODS.keys()):
    visible_mask = [False] * (n * 2)
    visible_mask[i * 2]     = True   # bar
    visible_mask[i * 2 + 1] = True   # pie
    agg = period_data[label]
    buttons.append(dict(
        label=label,
        method="update",
        args=[
            {"visible": visible_mask},
            {"title.text": (
                f"Сделки по типу — {label} "
                f"<span style='font-size:13px;color:{LP_MUTED}'>"
                f"| {agg['deal_count'].sum():,} сделок, {len(agg)} типов</span>"
            )},
        ],
    ))

fig.update_layout(
    title=dict(
        text=(
            f"Сделки по типу — {first_label} "
            f"<span style='font-size:13px;color:{LP_MUTED}'>"
            f"| {first_df['deal_count'].sum():,} сделок, {len(first_df)} типов</span>"
        ),
        font=dict(size=18, color=LP_DARK),
        x=0.01,
    ),
    updatemenus=[dict(
        type="buttons",
        direction="right",
        buttons=buttons,
        x=0.0,
        y=1.15,
        xanchor="left",
        yanchor="top",
        bgcolor="white",
        bordercolor=LP_DARK,
        font=dict(size=12),
        active=0,
    )],
    paper_bgcolor=LP_BG,
    plot_bgcolor="white",
    font=dict(family="Arial, sans-serif", color=LP_DARK),
    showlegend=False,
    margin=dict(t=120, b=80, l=60, r=40),
    height=520,
    annotations=[
        dict(
            text=f"Источник: presales_project_all_marts.v_presale_deals  |  "
                 f"Обновлено: {datetime.now().strftime('%d.%m.%Y %H:%M')}",
            xref="paper", yref="paper",
            x=0, y=-0.12,
            showarrow=False,
            font=dict(size=10, color=LP_MUTED),
            align="left",
        )
    ],
)

fig.update_xaxes(
    tickangle=-35,
    tickfont=dict(size=11),
    gridcolor="#f3f4f6",
    row=1, col=1,
)
fig.update_yaxes(
    title_text="Количество сделок",
    gridcolor="#e5e7eb",
    row=1, col=1,
)

fig.write_html(OUTPUT_HTML, include_plotlyjs="cdn")
print(f"\nДашборд сохранён: {OUTPUT_HTML}")


# === 6. ВЫВОДЫ =================================================================

print("\n" + "=" * 60)
print("ВЫВОДЫ (Всё время)")
all_df = period_data["Всё время"]
top3 = all_df.head(3)
print(f"\nТоп-3 типа сделок:")
for _, row in top3.iterrows():
    print(f"  {row['deal_type']:30s} {row['deal_count']:>8,}  ({row['pct']}%)")
print(f"\nДля Novosel pilot: найди строки с 'новосёл' в deal_type выше.")
print(f"Если нет — уточни у PM точное значение и скорректируй SQL.")
print("=" * 60)
