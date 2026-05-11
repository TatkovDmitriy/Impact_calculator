"""
Оркестратор: GP → analyze → Firestore (или _outbox fallback).
Запускать на корп ПК: cd research && python scripts/segment_novosel_deal_size_distribution/publish.py
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

DATE_FROM = '2026-01-01'
DATE_TO   = '2026-12-31'

SLUG           = 'segment_novosel_deal_size_distribution'
SCRIPT_VERSION = '1.0.0'
PUBLISHED_BY   = os.getenv('DA_EMAIL', 'dmitriy.tatkov@lemanapro.ru')

QUERY_DIR = Path(__file__).parent


def main() -> None:
    log.info('=== publish START: %s ===', SLUG)
    log.info('Период: %s — %s', DATE_FROM, DATE_TO)

    sql_text = (QUERY_DIR / 'query.sql').read_text(encoding='utf-8')
    source_hash = hashlib.sha256(sql_text.encode()).hexdigest()

    sql_filled = sql_text.format(date_from=DATE_FROM, date_to=DATE_TO)

    log.info('Выгружаю данные из GP...')
    df = query_df(sql_filled)
    log.info('Получено строк: %d', len(df))

    assert len(df) > 0, 'GP вернул пустой DataFrame'
    total_clients = int(df['count_clients'].sum())
    assert total_clients > 0, 'Клиентов-Новоселов = 0'
    log.info('[sanity] Строк: %d, платящих Новоселов: %d', len(df), total_clients)

    log.info('Вычисляю payload...')
    payload = compute_payload(df)

    kpi_map = {i['label']: i['value'] for i in payload['blocks'][0]['items']}
    assert kpi_map['Платящих клиентов-Новоселов'] > 0
    log.info('[sanity] Клиентов: %d, GMV: %d', kpi_map['Платящих клиентов-Новоселов'], kpi_map['GMV Новоселов'])

    doc = {
        'slug':        SLUG,
        'title':       'Новоселы: распределение по AOV-сегментам (2026)',
        'description': (QUERY_DIR / 'description.md').read_text(encoding='utf-8'),
        'category':    'segments',
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
