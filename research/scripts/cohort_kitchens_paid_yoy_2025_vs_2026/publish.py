"""
Оркестратор: GP → analyze → Firestore (или _outbox fallback).
Запускать на корп ПК: cd research && python scripts/cohort_kitchens_paid_yoy_2025_vs_2026/publish.py
"""
from __future__ import annotations

import hashlib
import logging
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from shared.gp_client import query_df
from shared.fb_publisher import FbPublisher
from analyze import compute_payload

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
YEAR_1 = '2025'
YEAR_2 = '2026'

SLUG           = 'cohort_kitchens_paid_yoy_2025_vs_2026'
SCRIPT_VERSION = '1.0.0'
PUBLISHED_BY   = os.getenv('DA_EMAIL', 'dmitriy.tatkov@lemanapro.ru')

QUERY_DIR = Path(__file__).parent
# ---------------------------------------------------------------------------


def _strip_comments(sql: str) -> str:
    lines = sql.strip().splitlines()
    for i, line in enumerate(lines):
        if line.strip() and not line.strip().startswith('--'):
            return '\n'.join(lines[i:]).strip()
    return ''


def main() -> None:
    log.info('=== publish START: %s ===', SLUG)
    log.info('Период: янв–апр %s vs %s', YEAR_1, YEAR_2)

    sql_text = (QUERY_DIR / 'query.sql').read_text(encoding='utf-8')
    source_hash = hashlib.sha256(sql_text.encode()).hexdigest()

    sql_filled = sql_text.format(year1=YEAR_1, year2=YEAR_2)
    queries = [_strip_comments(q) for q in sql_filled.split(';') if _strip_comments(q)]

    monthly_sql  = queries[0]
    segments_sql = queries[1]

    log.info('Выгружаю помесячную динамику...')
    df_monthly = query_df(monthly_sql)
    log.info('Monthly: %d строк', len(df_monthly))

    log.info('Выгружаю ценовые сегменты...')
    df_segments = query_df(segments_sql)
    log.info('Segments: %d строк', len(df_segments))

    _sanity_input(df_monthly, df_segments)

    log.info('Вычисляю payload...')
    payload = compute_payload(df_monthly, df_segments)

    _sanity_payload(payload)

    doc = {
        'slug':        SLUG,
        'title':       f'Кухни оплаченные: YoY {YEAR_1} vs {YEAR_2} (янв–апр)',
        'description': (QUERY_DIR / 'description.md').read_text(encoding='utf-8'),
        'category':    'cohorts',
        'payload':     payload,
        'meta': {
            'sourceQueryHash': source_hash,
            'rowCountSource':  len(df_monthly) + len(df_segments),
            'publishedBy':     PUBLISHED_BY,
            'scriptVersion':   SCRIPT_VERSION,
        },
    }

    FbPublisher().publish(SLUG, doc)
    log.info('=== publish OK: %s ===', SLUG)


def _sanity_input(df_monthly, df_segments) -> None:
    assert len(df_monthly) > 0, 'df_monthly пустой'
    assert len(df_segments) > 0, 'df_segments пустой'
    years = df_monthly['period_year'].unique().tolist()
    assert len(years) >= 2, f'Ожидается 2 года, получено: {years}'
    log.info('[sanity] Входные данные OK: monthly=%d, segments=%d', len(df_monthly), len(df_segments))


def _sanity_payload(payload: dict) -> None:
    assert payload['kind'] == 'composite'
    kpi_items = {i['label']: i for i in payload['blocks'][0]['items']}
    deals_key = next(k for k in kpi_items if 'Сделок' in k and YEAR_2 in k)
    deals2 = kpi_items[deals_key]['value']
    assert deals2 > 0, f'Сделок {YEAR_2} = 0'
    delta = kpi_items[deals_key].get('delta', 0)
    log.info('[sanity] Сделок %s: %d (delta: %.1f%%)', YEAR_2, deals2, delta)
    log.info('[sanity] Все проверки пройдены')


if __name__ == '__main__':
    main()
