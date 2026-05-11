"""
Оркестратор: GP → analyze → Firestore (или _outbox fallback).
Запускать на корп ПК: cd research && python scripts/cohort_novosel_2026_categories_margin/publish.py
"""
from __future__ import annotations

import hashlib
import logging
import os
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from shared.gp_client import query_df
from shared.fb_publisher import FbPublisher
from analyze import compute_payload

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
DATE_FROM = date(2026, 1, 1)
DATE_TO   = date(2027, 1, 1)   # весь 2026 год

SLUG           = 'cohort_novosel_2026_categories_margin'
SCRIPT_VERSION = '1.0.0'
PUBLISHED_BY   = os.getenv('DA_EMAIL', 'dmitriy.tatkov@lemanapro.ru')

QUERY_DIR = Path(__file__).parent
# ---------------------------------------------------------------------------


def main() -> None:
    log.info('=== publish START: %s ===', SLUG)
    log.info('Период: %s — %s', DATE_FROM, DATE_TO)

    sql_text = (QUERY_DIR / 'query.sql').read_text(encoding='utf-8')
    source_hash = hashlib.sha256(sql_text.encode()).hexdigest()

    sql_filled = sql_text.format(
        date_from=DATE_FROM.strftime('%Y-%m-%d'),
        date_to=DATE_TO.strftime('%Y-%m-%d'),
    )

    log.info('Выгружаю данные из GP...')
    df = query_df(sql_filled)
    log.info('Получено строк: %d', len(df))

    assert len(df) > 0, 'GP вернул пустой DataFrame'
    for col in ('count_clients', 'count_deals', 'count_paid_deals', 'total_budget', 'total_margin'):
        assert col in df.columns, f'Нет колонки {col}'
    log.info('[sanity] Входные данные OK: %d месяцев', len(df))

    log.info('Вычисляю payload...')
    payload = compute_payload(df)

    kpi_map = {i['label']: i['value'] for i in payload['blocks'][0]['items']}
    clients = kpi_map['Клиентов-Новоселов 2026']
    assert clients > 0, 'Клиентов-Новоселов = 0'
    conv = kpi_map['Конверсия в оплату']
    assert 0 < conv < 100, f'Конверсия вне диапазона: {conv}'
    log.info('[sanity] Клиентов: %d, Конверсия: %.1f%%', clients, conv)

    doc = {
        'slug':        SLUG,
        'title':       'Новоселы 2026: динамика сделок и маржи по месяцам',
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
