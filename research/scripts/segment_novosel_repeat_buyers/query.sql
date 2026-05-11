-- Исследование: Частота покупок Новоселов vs Базы по месяцам
-- Источник: research/notebooks/Потенциал Новоселов 07.05.2026.ipynb, ячейка 15 (sql_freq_total)
-- Greenplum = PostgreSQL 12, только SELECT
-- Переменные date_from / date_to задаются в publish.py

SELECT
    DATE_TRUNC('month', d.createddate)::DATE                        AS deal_month,
    CASE
        WHEN t.client_number IS NOT NULL THEN 'Новосел'
        ELSE 'Не Новосел'
    END                                                             AS client_segment,
    COUNT(DISTINCT d.customer_systemid)                             AS unique_clients,
    COUNT(DISTINCT d.project_reference_id)                          AS total_deals,
    COUNT(DISTINCT CASE WHEN d.turnover_full > 0 THEN d.project_reference_id END) AS paid_deals
FROM presales_project_all_marts.v_presale_deals d
LEFT JOIN customer_mdm_tags_ods.v_client_tags t
    ON d.customer_systemid = t.client_number
    AND t.tag_catalog_id = '1'
    AND t.is_actual = '1'
WHERE d.createddate >= '{date_from}'
  AND d.createddate <= '{date_to}'
GROUP BY 1, 2
ORDER BY 1, 2
