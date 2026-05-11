-- Исследование: YoY динамика оплаченных сделок по кухням (2025 vs 2026)
-- Источник: research/notebooks/Потенциал Новоселов 07.05.2026.ipynb, ячейка 16
-- Greenplum = PostgreSQL 12, только SELECT
-- Переменные year1/year2 задаются в publish.py

-- ============================================================
-- ЗАПРОС 1: Помесячная динамика — кол-во сделок и выручка
-- ============================================================
SELECT
    EXTRACT(MONTH FROM d.createddate)::INT                          AS month_num,
    CASE
        WHEN d.createddate >= '{year1}-01-01' AND d.createddate < '{year1}-05-01' THEN '{year1}'
        WHEN d.createddate >= '{year2}-01-01' AND d.createddate < '{year2}-05-01' THEN '{year2}'
    END                                                             AS period_year,
    COUNT(DISTINCT d.project_reference_id)                         AS deal_count,
    SUM(d.turnover_full)                                           AS total_revenue
FROM presales_project_all_marts.v_presale_deals d
WHERE d.turnover_full > 0
  AND LOWER(d.deal_type) LIKE '%kitchen%'
  AND (
      (d.createddate >= '{year1}-01-01' AND d.createddate < '{year1}-05-01')
   OR (d.createddate >= '{year2}-01-01' AND d.createddate < '{year2}-05-01')
  )
GROUP BY 1, 2
ORDER BY 2, 1;


-- ============================================================
-- ЗАПРОС 2: Ценовые сегменты (распределение сделок по AOV)
-- ============================================================
SELECT
    CASE
        WHEN d.createddate >= '{year1}-01-01' AND d.createddate < '{year1}-05-01' THEN '{year1}'
        WHEN d.createddate >= '{year2}-01-01' AND d.createddate < '{year2}-05-01' THEN '{year2}'
    END                                                             AS period_year,
    CASE
        WHEN d.turnover_full < 100000                              THEN 'до 100к'
        WHEN d.turnover_full < 250000                              THEN '100–250к'
        WHEN d.turnover_full < 500000                              THEN '250–500к'
        WHEN d.turnover_full < 1000000                             THEN '500к–1М'
        ELSE                                                            '1М+'
    END                                                             AS price_segment,
    COUNT(DISTINCT d.project_reference_id)                         AS deal_count
FROM presales_project_all_marts.v_presale_deals d
WHERE d.turnover_full > 0
  AND LOWER(d.deal_type) LIKE '%kitchen%'
  AND (
      (d.createddate >= '{year1}-01-01' AND d.createddate < '{year1}-05-01')
   OR (d.createddate >= '{year2}-01-01' AND d.createddate < '{year2}-05-01')
  )
GROUP BY 1, 2
ORDER BY 1, 2
