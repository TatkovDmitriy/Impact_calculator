-- Исследование: Тепловая карта проникновения Новоселов по типам сделок
-- Источник: research/notebooks/Потенциал Новоселов 07.05.2026.ipynb, ячейка 3
-- Greenplum = PostgreSQL 12, только SELECT
-- Переменные дат задаются в publish.py

SELECT
    DATE_TRUNC('month', d.createddate)::DATE                          AS deal_month,
    COALESCE(d.deal_type, 'UNKNOWN')                                  AS deal_type,
    COUNT(d.project_reference_id)                                     AS total_deals,
    SUM(CASE WHEN t.client_number IS NOT NULL THEN 1 ELSE 0 END)     AS novosel_deals
FROM presales_project_all_marts.v_presale_deals d
LEFT JOIN customer_mdm_tags_ods.v_client_tags t
    ON  d.customer_systemid = t.client_number
    AND t.tag_catalog_id    = '1'
    AND t.is_actual         = '1'
WHERE d.createddate >= '{date_from}'
  AND d.createddate <  '{date_to}'
GROUP BY 1, 2
ORDER BY 1, 2
