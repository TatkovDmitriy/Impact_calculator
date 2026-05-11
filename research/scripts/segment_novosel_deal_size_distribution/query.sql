-- Исследование: Распределение клиентов-Новоселов по AOV-сегментам
-- Источник: research/notebooks/Потенциал Новоселов 07.05.2026.ipynb, ячейка 23 (sql_aov_segments)
-- Greenplum = PostgreSQL 12, только SELECT
-- Переменные date_from / date_to задаются в publish.py
-- Примечание: диапазоны AOV взяты из ноутбука (5 сегментов), а не из описания задачи (3 сегмента)

WITH client_data AS (
    SELECT
        d.customer_systemid                                                                AS client_id,
        COUNT(DISTINCT d.project_reference_id)                                             AS total_deals,
        COUNT(DISTINCT CASE WHEN d.turnover_full > 0 THEN d.project_reference_id END)     AS paid_deals,
        SUM(CASE WHEN d.turnover_full > 0 THEN d.turnover_full ELSE 0 END)                AS total_gmv,
        SUM(CASE WHEN d.turnover_full > 0 THEN d.line_margin ELSE 0 END)                  AS total_margin
    FROM presales_project_all_marts.v_presale_deals d
    INNER JOIN customer_mdm_tags_ods.v_client_tags t
        ON d.customer_systemid = t.client_number
        AND t.tag_catalog_id = '1'
        AND t.is_actual = '1'
    WHERE d.createddate >= '{date_from}'
      AND d.createddate <= '{date_to}'
      AND (
           LOWER(d.deal_type) LIKE '%kitchen%'
           OR LOWER(d.deal_type) LIKE '%bathroom%'
           OR LOWER(d.deal_type) LIKE '%storage%'
           OR LOWER(d.deal_type) LIKE '%interior_door%'
      )
    GROUP BY 1
),
client_aov AS (
    SELECT
        client_id,
        total_deals,
        paid_deals,
        total_gmv,
        total_margin,
        CASE WHEN paid_deals > 0 THEN total_gmv / paid_deals ELSE 0 END AS aov
    FROM client_data
    WHERE paid_deals > 0
)
SELECT
    CASE
        WHEN aov <= 50000 THEN '1. До 50 000 руб.'
        WHEN aov > 50000  AND aov <= 100000 THEN '2. 50 001–100 000 руб.'
        WHEN aov > 100000 AND aov <= 150000 THEN '3. 100 001–150 000 руб.'
        WHEN aov > 150000 AND aov <= 200000 THEN '4. 150 001–200 000 руб.'
        ELSE                                     '5. Свыше 200 000 руб.'
    END                          AS aov_segment,
    COUNT(client_id)             AS count_clients,
    SUM(paid_deals)              AS total_paid_deals,
    SUM(total_gmv)               AS total_gmv,
    SUM(total_margin)            AS total_margin
FROM client_aov
GROUP BY 1
ORDER BY 1
