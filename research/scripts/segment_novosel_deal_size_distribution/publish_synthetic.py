"""
UI-тест без GP: синтетические данные → compute_payload → _outbox.
Запускать: cd research && python scripts/segment_novosel_deal_size_distribution/publish_synthetic.py
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

SLUG = 'segment_novosel_deal_size_distribution'
QUERY_DIR = Path(__file__).parent


def make_synthetic_df() -> pd.DataFrame:
    return pd.DataFrame([
        {'aov_segment': '1. До 50 000 руб.',       'count_clients': 150, 'total_paid_deals': 160, 'total_gmv': 4_500_000,  'total_margin': 900_000},
        {'aov_segment': '2. 50 001–100 000 руб.',  'count_clients': 320, 'total_paid_deals': 350, 'total_gmv': 24_000_000, 'total_margin': 5_000_000},
        {'aov_segment': '3. 100 001–150 000 руб.', 'count_clients': 180, 'total_paid_deals': 200, 'total_gmv': 24_000_000, 'total_margin': 5_500_000},
        {'aov_segment': '4. 150 001–200 000 руб.', 'count_clients': 90,  'total_paid_deals': 100, 'total_gmv': 16_500_000, 'total_margin': 4_000_000},
        {'aov_segment': '5. Свыше 200 000 руб.',   'count_clients': 60,  'total_paid_deals': 70,  'total_gmv': 17_000_000, 'total_margin': 4_200_000},
    ])


def main() -> None:
    log.info('=== publish_synthetic START: %s ===', SLUG)
    df = make_synthetic_df()
    payload = compute_payload(df)

    doc = {
        'slug':        SLUG,
        'title':       '[SYNTHETIC] Новоселы: распределение по AOV-сегментам (2026)',
        'description': (QUERY_DIR / 'description.md').read_text(encoding='utf-8'),
        'category':    'segments',
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
