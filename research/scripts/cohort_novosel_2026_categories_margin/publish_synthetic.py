"""
UI-тест без GP: синтетические данные → compute_payload → _outbox.
Запускать: cd research && python scripts/cohort_novosel_2026_categories_margin/publish_synthetic.py
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

SLUG = 'cohort_novosel_2026_categories_margin'
QUERY_DIR = Path(__file__).parent


def make_synthetic_df() -> pd.DataFrame:
    months_data = [
        ('2026-01-01', 180, 210,  95, 14_250_000, 2_850_000),
        ('2026-02-01', 195, 230, 105, 16_380_000, 3_276_000),
        ('2026-03-01', 220, 265, 122, 19_520_000, 3_904_000),
        ('2026-04-01', 210, 250, 115, 18_400_000, 3_680_000),
        ('2026-05-01', 230, 278, 130, 21_450_000, 4_290_000),
        ('2026-06-01', 245, 295, 138, 23_460_000, 4_692_000),
    ]
    return pd.DataFrame(months_data, columns=[
        'deal_month', 'count_clients', 'count_deals',
        'count_paid_deals', 'total_budget', 'total_margin',
    ])


def main() -> None:
    log.info('=== publish_synthetic START: %s ===', SLUG)
    df = make_synthetic_df()
    payload = compute_payload(df)

    doc = {
        'slug':        SLUG,
        'title':       '[SYNTHETIC] Новоселы 2026: динамика сделок и маржи по месяцам',
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
