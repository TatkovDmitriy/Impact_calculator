-- Исследование: YoY динамика созданных сделок по кухням (2025 vs 2026)
-- Источник: research/notebooks/Потенциал Новоселов 07.05.2026.ipynb, ячейка 17
-- Greenplum = PostgreSQL 12, только SELECT
-- Переменные year1/year2 задаются в publish.py

SELECT
    EXTRACT(MONTH FROM d.createddate)::INT                          AS month_num,
    CASE
        WHEN d.createddate >= '{year1}-01-01' AND d.createddate < '{year1}-05-01' THEN '{year1}'
        WHEN d.createddate >= '{year2}-01-01' AND d.createddate < '{year2}-05-01' THEN '{year2}'
    END                                                             AS period_year,
    COUNT(DISTINCT d.project_reference_id)                         AS total_deals
FROM presales_project_all_marts.v_presale_deals d
WHERE LOWER(d.deal_type) LIKE '%kitchen%'
  AND (
      (d.createddate >= '{year1}-01-01' AND d.createddate < '{year1}-05-01')
   OR (d.createddate >= '{year2}-01-01' AND d.createddate < '{year2}-05-01')
  )
GROUP BY 1, 2
ORDER BY 2, 1
