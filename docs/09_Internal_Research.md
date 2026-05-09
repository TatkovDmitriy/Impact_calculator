# 09 — Internal Research

## Назначение

Вкладка «Исследования» — витрина аналитики, основанной на данных Greenplum (корпоративная БД ЛП).
DA-агент публикует результаты через Firebase Admin SDK в collection `research_items`.
Данные read-only для web-app, write — только с корпоративного ПК через Python-скрипт.

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
| `kpi` | 2–6 числовых карточек | ✅ реализован |
| `table` | Таблица с колонками | ⏳ Phase R3+ |
| `line_chart` | Линейный тренд | ⏳ Phase R3+ |
| `bar_chart` | Столбчатая диаграмма | ⏳ Phase R3+ |
| `composite` | Несколько блоков | ⏳ Phase R3+ |

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

**Локация:** `D:\Analyses\Pyton` (рабочий ПК, hand-curated коллекция)

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

### Pilot candidates (приоритет для первого исследования)

| Notebook | Почему важно для pilot |
|---|---|
| **Анализ клиентов Новосел.ipynb** | Прямо расширяет существующий Novosel-калькулятор, максимальная синергия |
| **Анализ клиентов Новосел 09.02.ipynb** | Свежая версия того же исследования, можно сравнить |
| Retention сделок (1).ipynb | Классика — cohort retention, kpi/line_chart payload |
| Анализ лидов 2025.ipynb | Свежие данные по воронке |
| Анализ отмененных сделок.ipynb | Loss-analysis, важно для разговора с CPO |

⚠️ Критично: оригиналы в `D:\Analyses\Pyton` НЕ редактируются. Любые правки делаются в копии в `research/notebooks/`.

## Конвенции для DA-агента

### Slug
- snake_case, латиница, без цифр в начале
- Префикс по теме: `metrics_*`, `cohort_*`, `funnel_*`, `segment_*`
- Пример: `cohort_novosel_retention_q1_2026`

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
  page.tsx              страница /research
  components/
    ResearchCard.tsx    карточка исследования (switch по kind)
    KpiRenderer.tsx     рендерер kind='kpi'
    MarkdownDescription.tsx  react-markdown обёртка
```

## Обновление Security Rules

После добавления блока `research_items` в Security Rules (Phase R2):

```javascript
match /research_items/{slug} {
  allow read: if isAllowed();
  allow write: if false;
}
```

Применить в Firebase Console → Firestore → Rules → Publish.
