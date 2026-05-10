# 09 — Internal Research

## Назначение

Вкладка «Исследования» — витрина аналитики, основанной на данных Greenplum (корпоративная БД ЛП).
DA-агент публикует результаты через Firebase Admin SDK в collection `research_items`.
Данные read-only для web-app, write — только через DA-агент (корп ПК → `ops/_outbox/` → GitHub Actions → Firestore).

## Доступ

Whitelist: тот же config/access.emails, что для остального приложения.
На prod — только Дмитрий Татьков (dmtat924@gmail.com, dmitriy.tatkov@lemanapro.ru).

## Firestore Schema

### Collection: `research_items`

Document ID = `slug` (snake_case, уникальный идентификатор исследования).

```typescript
interface ResearchItem {
  slug: string;               // document ID, дублируется в поле
  title: string;              // отображаемый заголовок
  description: string;        // markdown, методология и выводы
  category: ResearchCategory; // 'metrics' | 'cohorts' | 'segments' | 'funnels' | 'other'
  payload: ResearchPayload;   // данные (зависит от kind)
  meta: ResearchMeta;
}

interface ResearchMeta {
  sourceQueryHash: string;    // SHA256 от query.sql (для детектирования изменений)
  lastRefreshedAt: Timestamp; // Firestore Timestamp
  rowCountSource: number;     // строк в исходном result set
  publishedBy: string;        // email DA-агента
  scriptVersion: string;      // semver: '1.0.0'
}
```

### Типы payload (kind)

| kind | Описание | Рендерер |
|---|---|---|
| `kpi` | 2–6 числовых карточек | ✅ реализован (Phase R2) |
| `table` | Таблица с колонками | ✅ реализован (Phase R3) |
| `line_chart` | Линейный тренд | ✅ реализован (Phase R3) |
| `bar_chart` | Столбчатая диаграмма | ✅ реализован (Phase R3) |
| `composite` | Несколько блоков (любые kind) | ✅ реализован (Phase R3) |

### KpiPayload (реализован в Phase R2)

```typescript
interface KpiPayload {
  kind: 'kpi';
  items: KpiItem[];      // обычно 2–6
}

interface KpiItem {
  label: string;
  value: number;
  unit: string;          // '₽', '%', 'шт', etc.
  delta?: number;        // period-over-period change
  deltaUnit?: string;
}
```

## Источник оригинальных исследований

**Локация:** `D:\Analyses\Pyton` (корпоративный ПК, hand-curated коллекция)

Содержит:
- **27 .ipynb файлов** — Jupyter ноутбуки с готовыми SQL-запросами и pandas-обработкой по корп-данным ЛП
- **password.json** — реальные creds к Greenplum (используются как референс, копируются в `research/.env`)
- **doc_2026-05-09_22-11-07.condarc** — conda-конфиг, не используется (мы на venv)

### Workflow с оригиналами

1. DA выбирает .ipynb из `D:\Analyses\Pyton` для воспроизведения в production
2. Копирует в `research/notebooks/<slug>.ipynb` (read-only оригинал, для трассировки)
3. Извлекает SQL → `research/scripts/<slug>/query.sql`
4. Извлекает pandas-обработку → `research/scripts/<slug>/analyze.py`
5. Добавляет publish-логику → `research/scripts/<slug>/publish.py`
6. Запускает, проверяет, push в Firestore

⚠️ Критично: оригиналы в `D:\Analyses\Pyton` НЕ редактируются. Любые правки делаются в копии в `research/notebooks/`.

## Конвенции для DA-агента

### Slug
- snake_case, латиница, без цифр в начале
- Префикс по теме: `metrics_*`, `cohort_*`, `funnel_*`, `segment_*`

### Versioning
- Семвер в `meta.scriptVersion`. minor bump = изменилась формула, major = breaking schema
- В Firestore хранится последняя версия. История — в git

### Sanity checks (обязательны перед публикацией)
- Sum/total: сумма частей == целое
- Top-N + остаток = 100%
- Нет NaN в payload
- Дат-диапазон совпадает с description.md

### Privacy
- Не публиковать PII (имена, телефоны, адреса, индивидуальные транзакции)
- k-anonymity floor: агрегаты с группой < 5 объектов не публиковать

## Путь к компонентам (web-app)

```
lib/research/
  types.ts              TypeScript интерфейсы (canonical)
  firestore.ts          getResearchItems() — читает из Firestore

app/(app)/research/
  page.tsx              страница /research (фильтры, счётчик, пустой стейт)
  components/
    ResearchCard.tsx        карточка исследования
    PayloadRenderer.tsx     switch по kind → нужный рендерер
    KpiRenderer.tsx         kind='kpi'
    TableRenderer.tsx       kind='table'
    LineChartRenderer.tsx   kind='line_chart' (Recharts, бренд-цвета)
    BarChartRenderer.tsx    kind='bar_chart' (Recharts, поддержка stacked)
    MarkdownDescription.tsx react-markdown + remark-gfm
```

## Публикация данных (DA workflow)

DA-агент кладёт JSON в `ops/_outbox/<slug>.json` и пушит в main.
GitHub Actions (`.github/workflows/upload_outbox.yml`) запускается автоматически:
запускает `ops/scripts/upload_outbox.py` с Firebase-секретами → пишет в Firestore → удаляет файл из outbox.

Личный ПК не нужен. Все Firebase-секреты хранятся в GitHub Actions Secrets (`FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`).

## Firestore Security Rules

Актуальные правила для `research_items` (применены в Firebase Console):

```javascript
match /research_items/{slug} {
  allow read: if isAllowed();
  allow write: if false;
}
```
