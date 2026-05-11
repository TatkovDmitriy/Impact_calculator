"""
Оркестратор: GP → analyze → Firestore (или _outbox fallback).
Запускать на корп ПК: cd research && python scripts/cohort_kitchens_created_yoy_2025_vs_2026/publish.py
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

SLUG           = 'cohort_kitchens_created_yoy_2025_vs_2026'
SCRIPT_VERSION = '1.0.0'
PUBLISHED_BY   = os.getenv('DA_EMAIL', 'dmitriy.tatkov@lemanapro.ru')

QUERY_DIR = Path(__file__).parent
# ---------------------------------------------------------------------------


def main() -> None:
    log.info('=== publish START: %s ===', SLUG)
    log.info('Период: янв–апр %s vs %s', YEAR_1, YEAR_2)

    sql_text = (QUERY_DIR / 'query.sql').read_text(encoding='utf-8')
    source_hash = hashlib.sha256(sql_text.encode()).hexdigest()

    sql_filled = sql_text.format(year1=YEAR_1, year2=YEAR_2)

    log.info('Выгружаю данные из GP...')
    df = query_df(sql_filled)
    log.info('Получено строк: %d', len(df))

    assert len(df) > 0, 'GP вернул пустой DataFrame'
    years = df['period_year'].unique().tolist()
    assert len(years) >= 2, f'Ожидается 2 года, получено: {years}'
    log.info('[sanity] Данные OK: %d строк, годы: %s', len(df), years)

    log.info('Вычисляю payload...')
    payload = compute_payload(df)

    kpi_map = {i['label']: i['value'] for i in payload['blocks'][0]['items']}
    key = next(k for k in kpi_map if 'Создано' in k and YEAR_2 in k)
    assert kpi_map[key] > 0, f'Сделок {YEAR_2} = 0'
    log.info('[sanity] Сделок %s: %d', YEAR_2, kpi_map[key])

    doc = {
        'slug':        SLUG,
        'title':       f'Кухни созданные: YoY {YEAR_1} vs {YEAR_2} (янв–апр)',
        'description': (QUERY_DIR / 'description.md').read_text(encoding='utf-8'),
        'category':    'cohorts',
        'payload':     payload,
        'meta': {
            'sourceQueryHash': source_hash,
            'rowCountSource':  len(df),
            'publishedBy':     PUBLISHED_BY,
            'scriptVersion':   SCRIPT_VERSION,
        },
    }

    FbPublisher().publish(SLUG, doc)
    log.info('=== publish OK: %s ===', SLUG)


if __name__ == '__main__':
    main()
