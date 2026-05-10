"""
Оркестратор: GP → analyze → Firestore (или _outbox fallback).
Запускать на корп ПК: cd research && python scripts/segment_novosel_potential_2026/publish.py
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import sys
from datetime import date, datetime
from pathlib import Path

# добавляем research/ в path для импорта shared-модулей
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from shared.gp_client import query_df
from shared.fb_publisher import FbPublisher
from analyze import compute_payload

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Временное окно — менять здесь, не в SQL
# ---------------------------------------------------------------------------
DATE_FROM = date(2026, 1, 1)
DATE_TO   = date(2026, 5, 1)   # не включительно (createddate < DATE_TO)

SLUG            = 'segment_novosel_potential_2026'
SCRIPT_VERSION  = '1.0.0'
PUBLISHED_BY    = os.getenv('DA_EMAIL', 'dmitriy.tatkov@lemanapro.ru')

QUERY_DIR = Path(__file__).parent
# ---------------------------------------------------------------------------


def load_sql(filename: str) -> str:
    return (QUERY_DIR / filename).read_text(encoding='utf-8')


def main() -> None:
    log.info('=== publish START: %s ===', SLUG)
    log.info('Период: %s — %s', DATE_FROM, DATE_TO)

    sql_text = load_sql('query.sql')
    source_hash = hashlib.sha256(sql_text.encode()).hexdigest()

    # позиционные параметры: (date_from, date_to) — два %s в каждом запросе
    params = (DATE_FROM, DATE_TO)

    # разбиваем на два запроса и убираем ведущие комментарии
    queries = [_strip_comments(q) for q in sql_text.split(';') if _strip_comments(q)]

    penetration_sql = queries[0]
    aov_sql         = queries[1]

    log.info('Выгружаю проникновение...')
    df_p = query_df(penetration_sql, params)
    log.info('Проникновение: %d строк', len(df_p))

    log.info('Выгружаю AOV...')
    df_a = query_df(aov_sql, params)
    log.info('AOV: %d строк', len(df_a))

    row_count = len(df_p) + len(df_a)
    log.info('rowCount итого: %d', row_count)

    log.info('Вычисляю payload...')
    payload = compute_payload(df_p, df_a)

    # sanity checks
    _sanity(payload, df_p, df_a)

    doc = {
        'slug':        SLUG,
        'title':       'Потенциал программы "Новоселы" 2026',
        'description': (QUERY_DIR / 'description.md').read_text(encoding='utf-8'),
        'category':    'segments',
        'payload':     payload,
        'meta': {
            'sourceQueryHash': source_hash,
            'rowCountSource':  row_count,
            'publishedBy':     PUBLISHED_BY,
            'scriptVersion':   SCRIPT_VERSION,
        },
    }

    FbPublisher().publish(SLUG, doc)
    log.info('=== publish OK: %s ===', SLUG)


def _sanity(payload: dict, df_p, df_a) -> None:
    kpi_items = {i['label']: i['value'] for i in payload['blocks'][0]['items']}

    pen = kpi_items['Проникновение Новоселов']
    assert 0 < pen < 100, f'Penetration out of range: {pen}'
    log.info('[sanity] Проникновение: %.1f%%', pen)

    aov_novosel = kpi_items['AOV Новоселов']
    assert aov_novosel > 0, f'AOV Новоселов = 0, что-то не так'
    log.info('[sanity] AOV Новоселов: %d ₽', aov_novosel)

    total_deals = kpi_items['Сделок проанализировано']
    assert total_deals > 100, f'Слишком мало сделок: {total_deals}'
    log.info('[sanity] Сделок: %d', total_deals)

    log.info('[sanity] Все проверки пройдены')


def _strip_comments(sql: str) -> str:
    """Убирает ведущие строки-комментарии, чтобы SQL начинался с SELECT/WITH."""
    lines = sql.strip().splitlines()
    for i, line in enumerate(lines):
        if line.strip() and not line.strip().startswith('--'):
            return '\n'.join(lines[i:]).strip()
    return ''


if __name__ == '__main__':
    main()
