"""
UI-тест без GP: синтетические данные → compute_payload → _outbox.
Запускать: cd research && python scripts/cohort_kitchens_created_yoy_2025_vs_2026/publish_synthetic.py
"""
from __future__ import annotations

import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import pandas as pd

from shared.fb_publisher import FbPublisher
from analyze import compute_payload

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger(__name__)

SLUG = 'cohort_kitchens_created_yoy_2025_vs_2026'
QUERY_DIR = Path(__file__).parent

YEAR_1 = '2025'
YEAR_2 = '2026'


def make_synthetic_df() -> pd.DataFrame:
    base = {1: 125, 2: 138, 3: 155, 4: 148}
    rows = []
    for month, cnt in base.items():
        rows.append({'month_num': month, 'period_year': YEAR_1, 'total_deals': cnt})
    for month, cnt in base.items():
        rows.append({'month_num': month, 'period_year': YEAR_2, 'total_deals': int(cnt * 1.17)})
    return pd.DataFrame(rows)


def main() -> None:
    log.info('=== publish_synthetic START: %s ===', SLUG)
    df = make_synthetic_df()
    payload = compute_payload(df)

    doc = {
        'slug':        SLUG,
        'title':       f'[SYNTHETIC] Кухни созданные: YoY {YEAR_1} vs {YEAR_2} (янв–апр)',
        'description': (QUERY_DIR / 'description.md').read_text(encoding='utf-8'),
        'category':    'cohorts',
        'payload':     payload,
        'meta': {
            'sourceQueryHash': 'synthetic',
            'rowCountSource':  len(df),
            'publishedBy':     'synthetic',
            'scriptVersion':   '1.0.0-synthetic',
        },
    }

    FbPublisher().publish(SLUG, doc)
    log.info('=== publish_synthetic OK: %s (→ _outbox) ===', SLUG)


if __name__ == '__main__':
    main()
