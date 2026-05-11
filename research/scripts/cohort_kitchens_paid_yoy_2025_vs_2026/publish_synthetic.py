"""
UI-тест без GP: синтетические данные → compute_payload → _outbox.
Запускать: cd research && python scripts/cohort_kitchens_paid_yoy_2025_vs_2026/publish_synthetic.py
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

SLUG = 'cohort_kitchens_paid_yoy_2025_vs_2026'
QUERY_DIR = Path(__file__).parent

YEAR_1 = '2025'
YEAR_2 = '2026'


def make_synthetic_monthly() -> pd.DataFrame:
    rows = []
    base_2025 = {1: (92, 13_800_000), 2: (98, 14_700_000), 3: (115, 17_250_000), 4: (108, 16_200_000)}
    for month, (cnt, rev) in base_2025.items():
        rows.append({'month_num': month, 'period_year': YEAR_1, 'deal_count': cnt, 'total_revenue': rev})
    for month, (cnt, rev) in base_2025.items():
        rows.append({'month_num': month, 'period_year': YEAR_2,
                     'deal_count': int(cnt * 1.16), 'total_revenue': int(rev * 1.22)})
    return pd.DataFrame(rows)


def make_synthetic_segments() -> pd.DataFrame:
    seg_2025 = {'до 100к': 55, '100–250к': 135, '250–500к': 150, '500к–1М': 60, '1М+': 13}
    seg_2026 = {'до 100к': 48, '100–250к': 145, '250–500к': 178, '500к–1М': 88, '1М+': 22}
    rows = []
    for seg, cnt in seg_2025.items():
        rows.append({'period_year': YEAR_1, 'price_segment': seg, 'deal_count': cnt})
    for seg, cnt in seg_2026.items():
        rows.append({'period_year': YEAR_2, 'price_segment': seg, 'deal_count': cnt})
    return pd.DataFrame(rows)


def main() -> None:
    log.info('=== publish_synthetic START: %s ===', SLUG)

    df_monthly  = make_synthetic_monthly()
    df_segments = make_synthetic_segments()

    payload = compute_payload(df_monthly, df_segments)

    doc = {
        'slug':        SLUG,
        'title':       f'[SYNTHETIC] Кухни оплаченные: YoY {YEAR_1} vs {YEAR_2} (янв–апр)',
        'description': (QUERY_DIR / 'description.md').read_text(encoding='utf-8'),
        'category':    'cohorts',
        'payload':     payload,
        'meta': {
            'sourceQueryHash': 'synthetic',
            'rowCountSource':  len(df_monthly) + len(df_segments),
            'publishedBy':     'synthetic',
            'scriptVersion':   '1.0.0-synthetic',
        },
    }

    FbPublisher().publish(SLUG, doc)
    log.info('=== publish_synthetic OK: %s (→ _outbox) ===', SLUG)


if __name__ == '__main__':
    main()
