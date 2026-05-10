-- ===========================================================================
-- segment_novosel_impact_2026 / query.sql
-- Анализ влияния тега «Новосел» на продажи в Лемана Про
--
-- Источник: presales_project_all_marts.v_presale_deals (Greenplum)
--           customer_mdm_tags_ods.v_client_tags         (Greenplum)
--
-- Референс-ноутбук: research/notebooks/segment_novosel_impact_2026.ipynb
--   (оригинал: D:\Analyses\Pyton\...__07.05.2026_4.ipynb)
-- Ячейки-референсы: 3 (EDA), 5 (heatmap), 6–8 (cat dynamics),
--                   9–12 (client segment), 14 (A/B), 15 (freq),
--                   16–17 (kitchen YoY), 18–20 (KPIs), 21 (clusters)
--
-- Временные окна — переменные Python в publish.py:
--   DATE_FULL_START  = '2025-12-01'
--   DATE_FULL_END    = '2026-04-30'
--   DATE_2026_START  = '2026-01-01'
--   DATE_2026_END    = '2026-04-30'
--   DATE_YOY_START_25 = '2025-01-01', DATE_YOY_END_25 = '2025-04-30'
--   DATE_YOY_START_26 = '2026-01-01', DATE_YOY_END_26 = '2026-04-30'
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- Q1: EDA — sample и stat по v_client_tags
-- ---------------------------------------------------------------------------
-- name: eda_tags
SELECT *
FROM customer_mdm_tags_ods.v_client_tags
LIMIT 1000;


-- ---------------------------------------------------------------------------
-- Q2: EDA — sample и stat по v_presale_deals
-- ---------------------------------------------------------------------------
-- name: eda_deals
SELECT *
FROM presales_project_all_marts.v_presale_deals
LIMIT 1000;


-- ---------------------------------------------------------------------------
-- Q3: Тепловая карта сделок по типу + доля новосёлов (Дек'25–Апр'26)
-- ---------------------------------------------------------------------------
-- name: deal_type_heatmap
SELECT
    DATE_TRUNC('month', d.createddate)::DATE     AS deal_month,
    COALESCE(d.deal_type, 'UNKNOWN')             AS deal_type,
    COUNT(d.project_reference_id)                AS total_deals,
    SUM(CASE WHEN t.client_number IS NOT NULL THEN 1 ELSE 0 END) AS novosel_deals
FROM presales_project_all_marts.v_presale_deals d
LEFT JOIN customer_mdm_tags_ods.v_client_tags t
    ON d.customer_systemid = t.client_number
    AND t.tag_catalog_id = '1'
    AND t.is_actual = '1'
WHERE d.createddate >= %(date_full_start)s
  AND d.createddate <= %(date_full_end)s
GROUP BY 1, 2
ORDER BY 1, 2;


-- ---------------------------------------------------------------------------
-- Q4: Динамика по магазинам — доля новосёлов в ванных (Фев–Апр'26)
-- ---------------------------------------------------------------------------
-- name: store_dynamics_bathroom
WITH raw AS (
    SELECT
        d.storeid,
        DATE_TRUNC('month', d.createddate)::DATE AS month,
        d.project_reference_id,
        CASE WHEN t.client_number IS NOT NULL THEN 1 ELSE 0 END AS is_novosel
    FROM presales_project_all_marts.v_presale_deals d
    LEFT JOIN customer_mdm_tags_ods.v_client_tags t
        ON d.customer_systemid = t.client_number
        AND t.tag_catalog_id = '1'
        AND t.is_actual = '1'
    WHERE d.createddate >= '2026-02-01'
      AND d.createddate <= %(date_2026_end)s
      AND LOWER(d.deal_type) LIKE '%bathroom%'
)
SELECT
    storeid,
    month,
    COUNT(DISTINCT project_reference_id) AS total_deals,
    SUM(is_novosel)                      AS novosel_deals,
    CASE
        WHEN COUNT(DISTINCT project_reference_id) > 0
        THEN (SUM(is_novosel)::FLOAT / COUNT(DISTINCT project_reference_id)) * 100
        ELSE 0
    END AS novosel_share
FROM raw
GROUP BY 1, 2
ORDER BY 1, 2;


-- ---------------------------------------------------------------------------
-- Q5: Ежемесячная динамика доли новосёлов по категории (Янв–Апр'26)
-- Параметр %(category_pattern)s передаётся отдельно для каждой категории
-- ---------------------------------------------------------------------------
-- name: category_monthly_dynamics
WITH raw AS (
    SELECT
        DATE_TRUNC('month', d.createddate)::DATE AS month,
        d.project_reference_id,
        CASE WHEN t.client_number IS NOT NULL THEN 1 ELSE 0 END AS is_novosel
    FROM presales_project_all_marts.v_presale_deals d
    LEFT JOIN customer_mdm_tags_ods.v_client_tags t
        ON d.customer_systemid = t.client_number
        AND t.tag_catalog_id = '1'
        AND t.is_actual = '1'
    WHERE d.createddate >= %(date_2026_start)s
      AND d.createddate <= %(date_2026_end)s
      AND LOWER(d.deal_type) LIKE %(category_pattern)s
),
monthly AS (
    SELECT
        month,
        COUNT(DISTINCT project_reference_id) AS total_deals,
        SUM(is_novosel)                      AS novosel_deals
    FROM raw
    GROUP BY 1
)
SELECT
    month,
    total_deals,
    novosel_deals,
    CASE
        WHEN total_deals > 0
        THEN (novosel_deals::FLOAT / total_deals) * 100
        ELSE 0
    END AS novosel_share
FROM monthly
ORDER BY 1;


-- ---------------------------------------------------------------------------
-- Q6: Динамика уникальных клиентов по сегменту и категории (Янв–Апр'26)
-- ---------------------------------------------------------------------------
-- name: client_segment_dynamics
WITH raw AS (
    SELECT
        DATE_TRUNC('month', d.createddate)::DATE AS month,
        d.customer_systemid,
        CASE
            WHEN t.client_number IS NOT NULL THEN 'Новоселы'
            ELSE 'База (Не новоселы)'
        END AS segment
    FROM presales_project_all_marts.v_presale_deals d
    LEFT JOIN customer_mdm_tags_ods.v_client_tags t
        ON d.customer_systemid = t.client_number
        AND t.tag_catalog_id = '1'
        AND t.is_actual = '1'
    WHERE d.createddate >= %(date_2026_start)s
      AND d.createddate <= %(date_2026_end)s
      AND LOWER(d.deal_type) LIKE %(category_pattern)s
)
SELECT
    month,
    segment,
    COUNT(DISTINCT customer_systemid) AS clients_count
FROM raw
GROUP BY 1, 2
ORDER BY 1, 2;


-- ---------------------------------------------------------------------------
-- Q7: A/B сравнение — выручка/конверсия по сегменту и категории (Дек'25–Апр'26)
-- Категории: kitchen, bathroom, storage
-- ---------------------------------------------------------------------------
-- name: ab_comparison
SELECT
    DATE_TRUNC('month', d.createddate)::DATE          AS deal_month,
    LOWER(d.deal_type)                                AS deal_type,
    CASE
        WHEN t.client_number IS NOT NULL THEN 'Новосел'
        ELSE 'Не Новосел'
    END                                               AS client_segment,
    COUNT(d.project_reference_id)                     AS total_deals,
    SUM(CASE WHEN d.turnover_full > 0 THEN 1 ELSE 0 END)            AS paid_deals,
    SUM(CASE WHEN d.turnover_full > 0 THEN d.turnover_full ELSE 0 END) AS total_revenue
FROM presales_project_all_marts.v_presale_deals d
LEFT JOIN customer_mdm_tags_ods.v_client_tags t
    ON d.customer_systemid = t.client_number
    AND t.tag_catalog_id = '1'
    AND t.is_actual = '1'
WHERE d.createddate >= %(date_full_start)s
  AND d.createddate <= %(date_full_end)s
  AND (
        LOWER(d.deal_type) LIKE '%kitchen%'
     OR LOWER(d.deal_type) LIKE '%bathroom%'
     OR LOWER(d.deal_type) LIKE '%storage%'
  )
GROUP BY 1, 2, 3
ORDER BY 1, 2, 3;


-- ---------------------------------------------------------------------------
-- Q8: Общая частотность — уникальные клиенты и проекты по сегменту (Дек'25–Апр'26)
-- ---------------------------------------------------------------------------
-- name: frequency_total
SELECT
    DATE_TRUNC('month', d.createddate)::DATE AS deal_month,
    CASE
        WHEN t.client_number IS NOT NULL THEN 'Новосел'
        ELSE 'Не Новосел'
    END                                      AS client_segment,
    COUNT(DISTINCT d.customer_systemid)      AS unique_clients,
    COUNT(DISTINCT d.project_reference_id)   AS total_deals,
    COUNT(DISTINCT CASE WHEN d.turnover_full > 0 THEN d.project_reference_id END) AS paid_deals
FROM presales_project_all_marts.v_presale_deals d
LEFT JOIN customer_mdm_tags_ods.v_client_tags t
    ON d.customer_systemid = t.client_number
    AND t.tag_catalog_id = '1'
    AND t.is_actual = '1'
WHERE d.createddate >= %(date_full_start)s
  AND d.createddate <= %(date_full_end)s
GROUP BY 1, 2
ORDER BY 1, 2;


-- ---------------------------------------------------------------------------
-- Q9: AOV и выручка по Кухням год-к-году (Янв–Апр 2025 vs 2026)
-- ---------------------------------------------------------------------------
-- name: kitchen_aov_yoy
SELECT
    d.project_reference_id                  AS deal_id,
    d.createddate,
    EXTRACT(MONTH FROM d.createddate)        AS month_num,
    CASE
        WHEN d.createddate >= %(yoy_start_25)s AND d.createddate < %(yoy_end_25)s THEN '2025'
        WHEN d.createddate >= %(yoy_start_26)s AND d.createddate < %(yoy_end_26)s THEN '2026'
    END                                     AS period_year,
    d.turnover_full                          AS revenue
FROM presales_project_all_marts.v_presale_deals d
WHERE d.turnover_full > 0
  AND LOWER(d.deal_type) LIKE '%kitchen%'
  AND (
        (d.createddate >= %(yoy_start_25)s AND d.createddate < %(yoy_end_25)s)
     OR (d.createddate >= %(yoy_start_26)s AND d.createddate < %(yoy_end_26)s)
  );


-- ---------------------------------------------------------------------------
-- Q10: Количество созданных сделок по Кухням год-к-году
-- ---------------------------------------------------------------------------
-- name: kitchen_created_yoy
SELECT
    EXTRACT(MONTH FROM d.createddate)        AS month_num,
    CASE
        WHEN d.createddate >= %(yoy_start_25)s AND d.createddate < %(yoy_end_25)s THEN '2025'
        WHEN d.createddate >= %(yoy_start_26)s AND d.createddate < %(yoy_end_26)s THEN '2026'
    END                                     AS period_year,
    COUNT(DISTINCT d.project_reference_id)  AS total_deals
FROM presales_project_all_marts.v_presale_deals d
WHERE LOWER(d.deal_type) LIKE '%kitchen%'
  AND (
        (d.createddate >= %(yoy_start_25)s AND d.createddate < %(yoy_end_25)s)
     OR (d.createddate >= %(yoy_start_26)s AND d.createddate < %(yoy_end_26)s)
  )
GROUP BY 1, 2
ORDER BY 2, 1;


-- ---------------------------------------------------------------------------
-- Q11: KPI-профиль сегмента «Новосел» за 2026 (все категории)
-- ---------------------------------------------------------------------------
-- name: kpi_novosel_2026
SELECT
    DATE_TRUNC('month', d.createddate)::DATE                                             AS deal_month,
    COUNT(DISTINCT d.customer_systemid)                                                  AS count_clients,
    COUNT(DISTINCT d.project_reference_id)                                               AS count_deals,
    COUNT(DISTINCT CASE WHEN d.turnover_full > 0 THEN d.project_reference_id END)        AS count_paid_deals,
    SUM(CASE WHEN d.turnover_full > 0 THEN d.turnover_full ELSE 0 END)                   AS total_budget,
    SUM(CASE WHEN d.turnover_full > 0 THEN d.line_margin   ELSE 0 END)                   AS total_margin
FROM presales_project_all_marts.v_presale_deals d
INNER JOIN customer_mdm_tags_ods.v_client_tags t
    ON d.customer_systemid = t.client_number
    AND t.tag_catalog_id = '1'
    AND t.is_actual = '1'
WHERE d.createddate >= %(date_2026_start)s
  AND d.createddate <= %(date_kpi_end)s
GROUP BY 1
ORDER BY 1;


-- ---------------------------------------------------------------------------
-- Q12: KPI-профиль сегмента «Не Новосел» за 2026 (все категории)
-- ---------------------------------------------------------------------------
-- name: kpi_base_2026
SELECT
    DATE_TRUNC('month', d.createddate)::DATE                                             AS deal_month,
    COUNT(DISTINCT d.customer_systemid)                                                  AS count_clients,
    COUNT(DISTINCT d.project_reference_id)                                               AS count_deals,
    COUNT(DISTINCT CASE WHEN d.turnover_full > 0 THEN d.project_reference_id END)        AS count_paid_deals,
    SUM(CASE WHEN d.turnover_full > 0 THEN d.turnover_full ELSE 0 END)                   AS total_budget,
    SUM(CASE WHEN d.turnover_full > 0 THEN d.line_margin   ELSE 0 END)                   AS total_margin
FROM presales_project_all_marts.v_presale_deals d
LEFT JOIN customer_mdm_tags_ods.v_client_tags t
    ON d.customer_systemid = t.client_number
    AND t.tag_catalog_id = '1'
    AND t.is_actual = '1'
WHERE d.createddate >= %(date_2026_start)s
  AND d.createddate <= %(date_kpi_end)s
  AND t.client_number IS NULL
GROUP BY 1
ORDER BY 1;


-- ---------------------------------------------------------------------------
-- Q13: KPI-профиль сегмента «Не Новосел» за 2025 — базовый бенчмарк
-- ---------------------------------------------------------------------------
-- name: kpi_base_2025
SELECT
    DATE_TRUNC('month', d.createddate)::DATE                                             AS deal_month,
    COUNT(DISTINCT d.customer_systemid)                                                  AS count_clients,
    COUNT(DISTINCT d.project_reference_id)                                               AS count_deals,
    COUNT(DISTINCT CASE WHEN d.turnover_full > 0 THEN d.project_reference_id END)        AS count_paid_deals,
    SUM(CASE WHEN d.turnover_full > 0 THEN d.turnover_full ELSE 0 END)                   AS total_budget,
    SUM(CASE WHEN d.turnover_full > 0 THEN d.line_margin   ELSE 0 END)                   AS total_margin
FROM presales_project_all_marts.v_presale_deals d
LEFT JOIN customer_mdm_tags_ods.v_client_tags t
    ON d.customer_systemid = t.client_number
    AND t.tag_catalog_id = '1'
    AND t.is_actual = '1'
WHERE d.createddate >= '2025-01-01'
  AND d.createddate <= '2025-12-31'
  AND t.client_number IS NULL
GROUP BY 1
ORDER BY 1;


-- ---------------------------------------------------------------------------
-- Q14: Поведенческие кластеры клиентов (Янв–Апр 2025 vs 2026)
-- ---------------------------------------------------------------------------
-- name: client_clusters
SELECT
    d.customer_systemid                                                               AS client_id,
    CASE
        WHEN d.createddate >= %(yoy_start_25)s AND d.createddate < %(yoy_end_25)s THEN '2025 (Янв-Апр)'
        WHEN d.createddate >= %(yoy_start_26)s AND d.createddate < %(yoy_end_26)s THEN '2026 (Янв-Апр)'
    END                                                                               AS period,
    COUNT(DISTINCT d.project_reference_id)                                            AS total_created_deals,
    COUNT(DISTINCT CASE WHEN d.turnover_full > 0 THEN d.project_reference_id END)     AS paid_deals,
    SUM(CASE WHEN d.turnover_full > 0 THEN d.turnover_full ELSE 0 END)                AS gmv,
    SUM(CASE WHEN d.turnover_full > 0 THEN d.line_margin   ELSE 0 END)                AS margin
FROM presales_project_all_marts.v_presale_deals d
WHERE (
        (d.createddate >= %(yoy_start_25)s AND d.createddate < %(yoy_end_25)s)
     OR (d.createddate >= %(yoy_start_26)s AND d.createddate < %(yoy_end_26)s)
  )
GROUP BY 1, 2;
