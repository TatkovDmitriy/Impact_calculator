"""
UI-тест без GP: синтетические данные → compute_payload → _outbox.
Запускать: cd research && python scripts/cohort_category_heatmap_novosel/publish_synthetic.py
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

SLUG = 'cohort_category_heatmap_novosel'
QUERY_DIR = Path(__file__).parent


def make_synthetic_df() -> pd.DataFrame:
    rows = []
    types = [
        ('Kitchen_standard', 250, 0.18),
        ('Kitchen_premium',  120, 0.22),
        ('Bathroom_project',  90, 0.14),
        ('Storage_solution',  70, 0.11),
        ('Bedroom_project',  160, 0.09),
        ('Wardrobe_project',  55, 0.07),
        ('Hallway_design',    45, 0.05),   # < 50 порог — попадёт в detail если storage/kitchen/bathroom нет
        ('Rare_type',         8,  0.10),   # < 50 — не попадёт в тепловую карту
    ]
    months = ['2025-12-01', '2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01']
    for deal_type, base_count, base_share in types:
        for i, month in enumerate(months):
            total = base_count + i * 8
            novosel = int(total * (base_share + i * 0.005))
            rows.append({
                'deal_month':    month,
                'deal_type':     deal_type,
                'total_deals':   total,
                'novosel_deals': min(novosel, total),
            })
    return pd.DataFrame(rows)


def main() -> None:
    log.info('=== publish_synthetic START: %s ===', SLUG)

    df = make_synthetic_df()
    log.info('Синтетических строк: %d', len(df))

    payload = compute_payload(df)

    doc = {
        'slug':        SLUG,
        'title':       '[SYNTHETIC] Тепловая карта: проникновение Новоселов по типам сделок',
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
