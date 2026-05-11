"""
Оркестратор: GP → analyze → Firestore (или _outbox fallback).
Запускать на корп ПК: cd research && python scripts/cohort_category_heatmap_novosel/publish.py
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
# Временное окно: декабрь 2025 — апрель 2026 (Novosel-теги доступны с дек 2025)
# ---------------------------------------------------------------------------
DATE_FROM = date(2025, 12, 1)
DATE_TO   = date(2026, 5, 1)   # не включительно

SLUG           = 'cohort_category_heatmap_novosel'
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

    _sanity_input(df)

    log.info('Вычисляю payload...')
    payload = compute_payload(df)

    _sanity_payload(payload)

    doc = {
        'slug':        SLUG,
        'title':       'Тепловая карта: проникновение Новоселов по типам сделок',
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


def _sanity_input(df) -> None:
    assert len(df) > 0, 'GP вернул пустой DataFrame'
    assert 'deal_month' in df.columns, 'Нет колонки deal_month'
    assert 'deal_type' in df.columns, 'Нет колонки deal_type'
    assert 'total_deals' in df.columns, 'Нет колонки total_deals'
    assert 'novosel_deals' in df.columns, 'Нет колонки novosel_deals'
    log.info('[sanity] Входные данные: %d строк, %d уникальных типов сделок',
             len(df), df['deal_type'].nunique())


def _sanity_payload(payload: dict) -> None:
    assert payload['kind'] == 'composite', 'Ожидался composite payload'
    kpi_items = {i['label']: i['value'] for i in payload['blocks'][0]['items']}

    pen = kpi_items['Проникновение Новоселов']
    assert 0 < pen < 100, f'Проникновение вне диапазона: {pen}'
    log.info('[sanity] Проникновение Новоселов: %.1f%%', pen)

    heatmap_rows = payload['blocks'][1]['rows']
    assert len(heatmap_rows) > 0, 'Тепловая карта пустая'
    log.info('[sanity] Типов в тепловой карте: %d', len(heatmap_rows))

    log.info('[sanity] Все проверки пройдены')


if __name__ == '__main__':
    main()
