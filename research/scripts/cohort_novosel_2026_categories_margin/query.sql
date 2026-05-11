-- Исследование: Помесячная динамика сделок и маржи Новоселов в 2026 году
-- Источник: research/notebooks/Потенциал Новоселов 07.05.2026.ipynb, ячейка 19
-- Greenplum = PostgreSQL 12, только SELECT
-- Переменные дат задаются в publish.py

SELECT
    DATE_TRUNC('month', d.createddate)::DATE                                     AS deal_month,
    COUNT(DISTINCT d.customer_systemid)                                           AS count_clients,
    COUNT(DISTINCT d.project_reference_id)                                        AS count_deals,
    COUNT(DISTINCT CASE WHEN d.turnover_full > 0 THEN d.project_reference_id END) AS count_paid_deals,
    SUM(CASE WHEN d.turnover_full > 0 THEN d.turnover_full ELSE 0 END)           AS total_budget,
    SUM(CASE WHEN d.turnover_full > 0 THEN d.line_margin   ELSE 0 END)           AS total_margin
FROM presales_project_all_marts.v_presale_deals d
INNER JOIN customer_mdm_tags_ods.v_client_tags t
    ON  d.customer_systemid = t.client_number
    AND t.tag_catalog_id    = '1'
    AND t.is_actual         = '1'
WHERE d.createddate >= '{date_from}'
  AND d.createddate <  '{date_to}'
GROUP BY 1
ORDER BY 1
