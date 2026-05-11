"""
Скрипт разведочного анализа для измерения инкрементального эффекта программы Новоселов.

Запуск на корп-машине (нужен доступ к GP):
    cd research
    python scripts/exploration_novosel_incrementality/explore.py

Результат: папка exploration_novosel_incrementality/output/ с CSV-файлами.
Скинь эту папку аналитику.
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

import pandas as pd
import psycopg2
import psycopg2.extras

# ---------------------------------------------------------------------------
# Подключение
# ---------------------------------------------------------------------------
_CONFIG_PATH = Path(os.getenv("DB_PASSWORDS_PATH",
                               str(Path(__file__).parent.parent.parent / "password.json")))

def _get_conn():
    with open(_CONFIG_PATH) as f:
        cfg = json.load(f)["green_plum"]
    return psycopg2.connect(
        host=cfg["host"], port=int(cfg["port"]),
        dbname=cfg["database"], user=cfg["user"], password=cfg["password"],
        connect_timeout=30, options="-c statement_timeout=180000",
    )

def qdf(sql: str, label: str) -> pd.DataFrame:
    print(f"  [{label}] running...", end=" ", flush=True)
    t0 = time.time()
    with _get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql)
            rows = cur.fetchall()
    df = pd.DataFrame(rows)
    print(f"{len(df)} rows, {time.time()-t0:.1f}s")
    return df

OUTPUT = Path(__file__).parent / "output"
OUTPUT.mkdir(exist_ok=True)

def save(df: pd.DataFrame, name: str):
    path = OUTPUT / f"{name}.csv"
    df.to_csv(path, index=False, encoding="utf-8-sig")
    print(f"    → saved {path.name}")


# ---------------------------------------------------------------------------
# Запросы
# ---------------------------------------------------------------------------

def run():
    print("\n=== EXPLORATION: Novosel Incrementality ===\n")

    # -------------------------------------------------------------------
    # 1. Структура таблицы тегов — что есть кроме is_actual и tag_catalog_id?
    # -------------------------------------------------------------------
    print("1. Структура v_client_tags (поля, примеры значений)")
    df = qdf("""
        SELECT *
        FROM customer_mdm_tags_ods.v_client_tags
        LIMIT 100
    """, "tags_sample")
    save(df, "01_client_tags_sample")

    # -------------------------------------------------------------------
    # 2. Теги: сколько Новоселов, есть ли дата присвоения тега?
    # -------------------------------------------------------------------
    print("2. Статистика тегов Новоселов (tag_catalog_id='1')")
    df = qdf("""
        SELECT
            tag_catalog_id,
            is_actual,
            COUNT(*)                    AS cnt,
            COUNT(DISTINCT client_number) AS uniq_clients,
            MIN(created_at)             AS min_created,
            MAX(created_at)             AS max_created
        FROM customer_mdm_tags_ods.v_client_tags
        WHERE tag_catalog_id = '1'
        GROUP BY 1, 2
        ORDER BY 3 DESC
    """, "tags_stats")
    save(df, "02_tags_stats")
    print("    Колонки:", df.columns.tolist())

    # -------------------------------------------------------------------
    # 3. Дата присвоения тега — есть ли? Пробуем разные имена колонок
    # -------------------------------------------------------------------
    print("3. Колонки v_client_tags (information_schema)")
    df = qdf("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'customer_mdm_tags_ods'
          AND table_name   = 'v_client_tags'
        ORDER BY ordinal_position
    """, "tags_columns")
    save(df, "03_tags_columns")

    # -------------------------------------------------------------------
    # 4. Колонки v_presale_deals
    # -------------------------------------------------------------------
    print("4. Колонки v_presale_deals (information_schema)")
    df = qdf("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'presales_project_all_marts'
          AND table_name   = 'v_presale_deals'
        ORDER BY ordinal_position
    """, "deals_columns")
    save(df, "04_deals_columns")

    # -------------------------------------------------------------------
    # 5. Общий масштаб: сколько Новоселов и сделок по годам
    # -------------------------------------------------------------------
    print("5. Масштаб: Новоселы и сделки по годам")
    df = qdf("""
        SELECT
            EXTRACT(YEAR FROM d.createddate)::INT    AS yr,
            CASE WHEN t.client_number IS NOT NULL
                 THEN 'Новосел' ELSE 'База' END       AS segment,
            COUNT(DISTINCT d.customer_systemid)      AS uniq_clients,
            COUNT(DISTINCT d.project_reference_id)   AS deals_created,
            COUNT(DISTINCT CASE WHEN d.turnover_full > 0
                 THEN d.project_reference_id END)     AS deals_paid,
            SUM(CASE WHEN d.turnover_full > 0
                 THEN d.turnover_full ELSE 0 END)     AS gmv,
            SUM(CASE WHEN d.turnover_full > 0
                 THEN d.line_margin ELSE 0 END)       AS margin
        FROM presales_project_all_marts.v_presale_deals d
        LEFT JOIN customer_mdm_tags_ods.v_client_tags t
            ON d.customer_systemid = t.client_number
           AND t.tag_catalog_id = '1' AND t.is_actual = '1'
        WHERE d.createddate >= '2024-01-01'
        GROUP BY 1, 2
        ORDER BY 1, 2
    """, "scale")
    save(df, "05_scale_by_year_segment")

    # -------------------------------------------------------------------
    # 6. Новоселы: сколько сделок до и после получения тега?
    #    (требует дату тега — пробуем разные имена поля)
    # -------------------------------------------------------------------
    print("6. Сделки до/после тега (пробуем поле created_at в тегах)")
    try:
        df = qdf("""
            WITH tag_dates AS (
                SELECT
                    client_number,
                    MIN(created_at) AS tag_date
                FROM customer_mdm_tags_ods.v_client_tags
                WHERE tag_catalog_id = '1'
                GROUP BY 1
            ),
            client_deals AS (
                SELECT
                    d.customer_systemid                          AS client_id,
                    t.tag_date,
                    CASE WHEN d.createddate < t.tag_date
                         THEN 'before' ELSE 'after' END          AS period,
                    COUNT(DISTINCT d.project_reference_id)       AS deals_created,
                    COUNT(DISTINCT CASE WHEN d.turnover_full > 0
                         THEN d.project_reference_id END)        AS deals_paid,
                    SUM(CASE WHEN d.turnover_full > 0
                         THEN d.turnover_full ELSE 0 END)        AS gmv
                FROM presales_project_all_marts.v_presale_deals d
                INNER JOIN tag_dates t
                    ON d.customer_systemid = t.client_number
                WHERE d.createddate >= '2024-01-01'
                  AND d.createddate <= '2026-12-31'
                GROUP BY 1, 2, 3
            )
            SELECT
                period,
                COUNT(DISTINCT client_id)       AS clients,
                SUM(deals_created)              AS total_deals_created,
                SUM(deals_paid)                 AS total_deals_paid,
                SUM(gmv)                        AS total_gmv,
                AVG(deals_paid)                 AS avg_paid_per_client,
                AVG(gmv)                        AS avg_gmv_per_client
            FROM client_deals
            GROUP BY 1
            ORDER BY 1
        """, "before_after")
        save(df, "06_before_after_tag")
    except Exception as e:
        print(f"    SKIP (no created_at?): {e}")
        # Попробуем найти правильное поле даты в следующем шаге

    # -------------------------------------------------------------------
    # 7. Когортный анализ: LTV Новоселов по месяцам после тега
    #    Группируем клиентов по месяцу получения тега,
    #    смотрим GMV по месяцам после (0, 1, 2, ... 12)
    # -------------------------------------------------------------------
    print("7. LTV-кривая: GMV по месяцам после получения тега")
    try:
        df = qdf("""
            WITH tag_dates AS (
                SELECT
                    client_number,
                    MIN(created_at::DATE) AS tag_date,
                    DATE_TRUNC('month', MIN(created_at::DATE))::DATE AS tag_cohort
                FROM customer_mdm_tags_ods.v_client_tags
                WHERE tag_catalog_id = '1'
                GROUP BY 1
            ),
            client_monthly AS (
                SELECT
                    d.customer_systemid                                   AS client_id,
                    t.tag_cohort,
                    DATE_TRUNC('month', d.createddate)::DATE              AS deal_month,
                    EXTRACT(MONTH FROM AGE(
                        DATE_TRUNC('month', d.createddate),
                        t.tag_cohort))::INT                               AS months_since_tag,
                    COUNT(DISTINCT d.project_reference_id)               AS deals_created,
                    COUNT(DISTINCT CASE WHEN d.turnover_full > 0
                         THEN d.project_reference_id END)                AS deals_paid,
                    SUM(CASE WHEN d.turnover_full > 0
                         THEN d.turnover_full ELSE 0 END)                AS gmv
                FROM presales_project_all_marts.v_presale_deals d
                INNER JOIN tag_dates t
                    ON d.customer_systemid = t.client_number
                WHERE d.createddate >= '2024-01-01'
                  AND d.createddate <= '2026-12-31'
                  AND DATE_TRUNC('month', d.createddate) >= t.tag_cohort
            GROUP BY 1, 2, 3, 4
            )
            SELECT
                months_since_tag,
                COUNT(DISTINCT client_id)   AS clients_active,
                SUM(deals_paid)             AS deals_paid,
                SUM(gmv)                    AS gmv,
                AVG(gmv)                    AS avg_gmv_per_active_client
            FROM client_monthly
            WHERE months_since_tag BETWEEN 0 AND 12
            GROUP BY 1
            ORDER BY 1
        """, "ltv_curve")
        save(df, "07_ltv_by_months_since_tag")
    except Exception as e:
        print(f"    SKIP: {e}")

    # -------------------------------------------------------------------
    # 8. Сравнение: Новоселы vs matched non-Новоселы
    #    Берём non-Новоселов с первой покупкой в том же месяце
    #    что и тег у Новоселов — proxy для "схожей жизненной стадии"
    # -------------------------------------------------------------------
    print("8. Траектория: Новоселы vs контрольная группа (первая покупка)")
    df = qdf("""
        WITH novosel_first AS (
            SELECT
                d.customer_systemid                              AS client_id,
                MIN(d.createddate)::DATE                        AS first_deal_date,
                DATE_TRUNC('month', MIN(d.createddate))::DATE   AS first_deal_cohort,
                'Новосел'                                       AS segment
            FROM presales_project_all_marts.v_presale_deals d
            INNER JOIN customer_mdm_tags_ods.v_client_tags t
                ON d.customer_systemid = t.client_number
               AND t.tag_catalog_id = '1' AND t.is_actual = '1'
            WHERE d.createddate >= '2025-01-01'
              AND d.createddate <= '2026-12-31'
            GROUP BY 1
        ),
        base_first AS (
            SELECT
                d.customer_systemid                              AS client_id,
                MIN(d.createddate)::DATE                        AS first_deal_date,
                DATE_TRUNC('month', MIN(d.createddate))::DATE   AS first_deal_cohort,
                'База'                                          AS segment
            FROM presales_project_all_marts.v_presale_deals d
            LEFT JOIN customer_mdm_tags_ods.v_client_tags t
                ON d.customer_systemid = t.client_number
               AND t.tag_catalog_id = '1' AND t.is_actual = '1'
            WHERE t.client_number IS NULL
              AND d.createddate >= '2025-01-01'
              AND d.createddate <= '2026-12-31'
            GROUP BY 1
        ),
        all_clients AS (
            SELECT * FROM novosel_first
            UNION ALL
            SELECT * FROM base_first
        ),
        trajectory AS (
            SELECT
                ac.segment,
                ac.first_deal_cohort,
                DATE_TRUNC('month', d.createddate)::DATE        AS deal_month,
                EXTRACT(MONTH FROM AGE(
                    DATE_TRUNC('month', d.createddate),
                    ac.first_deal_cohort))::INT                 AS months_since_first,
                COUNT(DISTINCT ac.client_id)                    AS active_clients,
                COUNT(DISTINCT d.project_reference_id)          AS deals_created,
                COUNT(DISTINCT CASE WHEN d.turnover_full > 0
                     THEN d.project_reference_id END)           AS deals_paid,
                SUM(CASE WHEN d.turnover_full > 0
                     THEN d.turnover_full ELSE 0 END)           AS gmv
            FROM all_clients ac
            JOIN presales_project_all_marts.v_presale_deals d
                ON ac.client_id = d.customer_systemid
            WHERE d.createddate >= '2025-01-01'
              AND d.createddate <= '2026-12-31'
              AND DATE_TRUNC('month', d.createddate) >= ac.first_deal_cohort
            GROUP BY 1, 2, 3, 4
        )
        SELECT
            segment,
            months_since_first,
            COUNT(DISTINCT first_deal_cohort)   AS cohorts,
            SUM(active_clients)                 AS clients,
            SUM(deals_paid)                     AS deals_paid,
            SUM(gmv)                            AS gmv,
            SUM(gmv) / NULLIF(SUM(active_clients), 0) AS avg_gmv_per_client
        FROM trajectory
        WHERE months_since_first BETWEEN 0 AND 12
        GROUP BY 1, 2
        ORDER BY 1, 2
    """, "trajectory")
    save(df, "08_trajectory_novosel_vs_base")

    # -------------------------------------------------------------------
    # 9. Категорийный кросс-сел: что ещё покупают Новоселы?
    # -------------------------------------------------------------------
    print("9. Категорийный микс: Новоселы vs База")
    df = qdf("""
        SELECT
            CASE WHEN t.client_number IS NOT NULL
                 THEN 'Новосел' ELSE 'База' END              AS segment,
            CASE
                WHEN LOWER(d.deal_type) LIKE '%kitchen%'       THEN 'Кухни'
                WHEN LOWER(d.deal_type) LIKE '%bathroom%'      THEN 'Ванные'
                WHEN LOWER(d.deal_type) LIKE '%storage%'       THEN 'Хранение'
                WHEN LOWER(d.deal_type) LIKE '%interior_door%' THEN 'Двери'
                WHEN LOWER(d.deal_type) LIKE '%bedroom%'       THEN 'Спальня'
                ELSE 'Другое'
            END                                              AS category,
            COUNT(DISTINCT d.customer_systemid)              AS clients,
            COUNT(DISTINCT d.project_reference_id)           AS deals_created,
            COUNT(DISTINCT CASE WHEN d.turnover_full > 0
                 THEN d.project_reference_id END)            AS deals_paid,
            SUM(CASE WHEN d.turnover_full > 0
                 THEN d.turnover_full ELSE 0 END)            AS gmv
        FROM presales_project_all_marts.v_presale_deals d
        LEFT JOIN customer_mdm_tags_ods.v_client_tags t
            ON d.customer_systemid = t.client_number
           AND t.tag_catalog_id = '1' AND t.is_actual = '1'
        WHERE d.createddate >= '2025-01-01'
          AND d.createddate <= '2026-12-31'
        GROUP BY 1, 2
        ORDER BY 1, 3 DESC
    """, "category_mix")
    save(df, "09_category_mix")

    # -------------------------------------------------------------------
    # 10. Repeat rate: доля клиентов с 2+ оплаченными сделками
    # -------------------------------------------------------------------
    print("10. Repeat rate: Новоселы vs База")
    df = qdf("""
        WITH client_paid AS (
            SELECT
                d.customer_systemid    AS client_id,
                CASE WHEN t.client_number IS NOT NULL
                     THEN 'Новосел' ELSE 'База' END AS segment,
                COUNT(DISTINCT CASE WHEN d.turnover_full > 0
                     THEN d.project_reference_id END) AS paid_deals
            FROM presales_project_all_marts.v_presale_deals d
            LEFT JOIN customer_mdm_tags_ods.v_client_tags t
                ON d.customer_systemid = t.client_number
               AND t.tag_catalog_id = '1' AND t.is_actual = '1'
            WHERE d.createddate >= '2025-01-01'
              AND d.createddate <= '2026-12-31'
            GROUP BY 1, 2
        )
        SELECT
            segment,
            COUNT(*)                                        AS total_clients,
            SUM(CASE WHEN paid_deals = 0 THEN 1 ELSE 0 END) AS paid_0,
            SUM(CASE WHEN paid_deals = 1 THEN 1 ELSE 0 END) AS paid_1,
            SUM(CASE WHEN paid_deals = 2 THEN 1 ELSE 0 END) AS paid_2,
            SUM(CASE WHEN paid_deals >= 3 THEN 1 ELSE 0 END) AS paid_3plus,
            ROUND(100.0 * SUM(CASE WHEN paid_deals >= 2 THEN 1 ELSE 0 END)
                / NULLIF(COUNT(*), 0), 2)                   AS repeat_rate_pct
        FROM client_paid
        GROUP BY 1
        ORDER BY 1
    """, "repeat_rate")
    save(df, "10_repeat_rate")

    # -------------------------------------------------------------------
    # 11. AOV динамика: средний чек Новоселов по месяцам 2025-2026
    # -------------------------------------------------------------------
    print("11. AOV по месяцам: Новоселы vs База")
    df = qdf("""
        SELECT
            DATE_TRUNC('month', d.createddate)::DATE        AS deal_month,
            CASE WHEN t.client_number IS NOT NULL
                 THEN 'Новосел' ELSE 'База' END              AS segment,
            COUNT(DISTINCT d.customer_systemid)              AS clients,
            COUNT(DISTINCT CASE WHEN d.turnover_full > 0
                 THEN d.project_reference_id END)            AS deals_paid,
            SUM(CASE WHEN d.turnover_full > 0
                 THEN d.turnover_full ELSE 0 END)            AS gmv,
            SUM(CASE WHEN d.turnover_full > 0
                 THEN d.line_margin ELSE 0 END)              AS margin,
            SUM(CASE WHEN d.turnover_full > 0
                 THEN d.turnover_full ELSE 0 END)
                / NULLIF(COUNT(DISTINCT CASE WHEN d.turnover_full > 0
                 THEN d.project_reference_id END), 0)        AS aov
        FROM presales_project_all_marts.v_presale_deals d
        LEFT JOIN customer_mdm_tags_ods.v_client_tags t
            ON d.customer_systemid = t.client_number
           AND t.tag_catalog_id = '1' AND t.is_actual = '1'
        WHERE d.createddate >= '2025-01-01'
          AND d.createddate <= '2026-12-31'
        GROUP BY 1, 2
        ORDER BY 1, 2
    """, "aov_monthly")
    save(df, "11_aov_monthly")

    # -------------------------------------------------------------------
    # 12. Конверсия (created → paid) по сегментам
    # -------------------------------------------------------------------
    print("12. Воронка: конверсия created → paid по сегментам")
    df = qdf("""
        SELECT
            CASE WHEN t.client_number IS NOT NULL
                 THEN 'Новосел' ELSE 'База' END              AS segment,
            EXTRACT(YEAR FROM d.createddate)::INT            AS yr,
            COUNT(DISTINCT d.project_reference_id)           AS deals_created,
            COUNT(DISTINCT CASE WHEN d.turnover_full > 0
                 THEN d.project_reference_id END)            AS deals_paid,
            ROUND(100.0 * COUNT(DISTINCT CASE WHEN d.turnover_full > 0
                 THEN d.project_reference_id END)
                / NULLIF(COUNT(DISTINCT d.project_reference_id), 0), 2) AS conversion_pct
        FROM presales_project_all_marts.v_presale_deals d
        LEFT JOIN customer_mdm_tags_ods.v_client_tags t
            ON d.customer_systemid = t.client_number
           AND t.tag_catalog_id = '1' AND t.is_actual = '1'
        WHERE d.createddate >= '2024-01-01'
          AND d.createddate <= '2026-12-31'
        GROUP BY 1, 2
        ORDER BY 2, 1
    """, "conversion")
    save(df, "12_conversion_funnel")

    print(f"\n=== DONE. Файлы в: {OUTPUT.resolve()} ===")
    print("Заархивируй папку 'output' и скинь аналитику.")


if __name__ == "__main__":
    run()
