-- Исследование: Потенциал программы "Новоселы" 2026
-- Источник: research/notebooks/Потенциал Новоселов 07.05.2026.ipynb
-- Воспроизвести в Jupyter: открыть ноутбук, запустить ячейки с pd.read_sql
--
-- Greenplum = PostgreSQL 12, только SELECT
-- Переменные дат задаются в publish.py и подставляются через параметры psycopg2

-- ============================================================
-- ЗАПРОС 1: Проникновение Новоселов по категориям и месяцам
-- ============================================================
-- Возвращает: deal_month, category, total_deals, novosel_deals, novosel_share_%
-- Используется для: line_chart тренд + KPI (avg penetration)

SELECT
    DATE_TRUNC('month', d.createddate)::DATE    AS deal_month,
    CASE
        WHEN LOWER(d.deal_type) LIKE '%kitchen%'       THEN 'Кухни'
        WHEN LOWER(d.deal_type) LIKE '%bathroom%'      THEN 'Ванные'
        WHEN LOWER(d.deal_type) LIKE '%storage%'       THEN 'Хранение'
        WHEN LOWER(d.deal_type) LIKE '%interior_door%' THEN 'Двери'
        ELSE 'Прочее'
    END                                                 AS category,
    COUNT(d.project_reference_id)               AS total_deals,
    SUM(CASE WHEN t.client_number IS NOT NULL THEN 1 ELSE 0 END) AS novosel_deals
FROM presales_project_all_marts.v_presale_deals d
LEFT JOIN customer_mdm_tags_ods.v_client_tags t
    ON  d.customer_systemid = t.client_number
    AND t.tag_catalog_id    = '1'
    AND t.is_actual         = '1'
WHERE d.createddate >= %s
  AND d.createddate <  %s
  AND (
      LOWER(d.deal_type) LIKE '%%kitchen%%'
   OR LOWER(d.deal_type) LIKE '%%bathroom%%'
   OR LOWER(d.deal_type) LIKE '%%storage%%'
   OR LOWER(d.deal_type) LIKE '%%interior_door%%'
  )
GROUP BY 1, 2
ORDER BY 1, 2;


-- ============================================================
-- ЗАПРОС 2: AOV и маржа — Новоселы vs База по категориям
-- ============================================================
-- Возвращает: category, client_segment, paid_deals, avg_aov, avg_margin
-- Используется для: bar_chart AOV + KPI (uplift)

SELECT
    CASE
        WHEN LOWER(d.deal_type) LIKE '%kitchen%'       THEN 'Кухни'
        WHEN LOWER(d.deal_type) LIKE '%bathroom%'      THEN 'Ванные'
        WHEN LOWER(d.deal_type) LIKE '%storage%'       THEN 'Хранение'
        WHEN LOWER(d.deal_type) LIKE '%interior_door%' THEN 'Двери'
        ELSE 'Прочее'
    END                                                          AS category,
    CASE WHEN t.client_number IS NOT NULL THEN 'Новосел' ELSE 'База' END AS client_segment,
    COUNT(CASE WHEN d.turnover_full > 0 THEN 1 END)              AS paid_deals,
    AVG(CASE WHEN d.turnover_full > 0 THEN d.turnover_full END)  AS avg_aov,
    AVG(CASE WHEN d.turnover_full > 0 THEN d.line_margin   END)  AS avg_margin
FROM presales_project_all_marts.v_presale_deals d
LEFT JOIN customer_mdm_tags_ods.v_client_tags t
    ON  d.customer_systemid = t.client_number
    AND t.tag_catalog_id    = '1'
    AND t.is_actual         = '1'
WHERE d.createddate >= %s
  AND d.createddate <  %s
  AND d.turnover_full > 0
  AND (
      LOWER(d.deal_type) LIKE '%%kitchen%%'
   OR LOWER(d.deal_type) LIKE '%%bathroom%%'
   OR LOWER(d.deal_type) LIKE '%%storage%%'
   OR LOWER(d.deal_type) LIKE '%%interior_door%%'
  )
GROUP BY 1, 2
ORDER BY 1, 2;
