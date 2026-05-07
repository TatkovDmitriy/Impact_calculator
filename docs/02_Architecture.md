# 02 — Архитектура и стек

## Стек

| Слой | Технология | Зачем |
|---|---|---|
| Framework | Next.js 15 (App Router) | SSR + serverless API routes на одном проекте |
| Язык | TypeScript (strict) | Type-safety для финансовых формул — критично |
| Стили | Tailwind CSS + CSS variables для бренд-токенов | Скорость + кастом-тема ЛП |
| UI-компоненты | shadcn/ui | Готовые primitives (Dialog, Table, Form), кастомизируемые под бренд |
| Графики (стандарт) | Recharts | Простые line/bar/area — быстро |
| Графики (сложные) | ECharts (echarts-for-react) | Sankey, treemap, heatmap, candlestick |
| Анимации | Framer Motion | Анимация чисел, появление графиков, transitions |
| Таблицы | TanStack Table | Сложные таблицы со сортировкой/группировкой |
| Auth | Firebase Auth (Email/Password) | Whitelist приглашённых пользователей |
| DB | Firestore | Сценарии, кеш Sheets-метрик, пользовательские настройки |
| Source of Truth (метрики) | Google Sheets API v4 | Через Service Account |
| Хостинг | Vercel | Free tier, авто-деплой из main |
| Шрифт | Manrope (fallback для LM Main) | Соответствие гайдлайнам ЛП |

## Структура проекта

```
impact_calculator/
├── app/                          # Next.js App Router
│   ├── (auth)/login/             # страница логина
│   ├── (app)/
│   │   ├── dashboard/            # главный дашборд
│   │   ├── calculators/
│   │   │   ├── page.tsx          # каталог
│   │   │   └── [slug]/page.tsx   # конкретный калькулятор
│   │   └── scenarios/            # сохранённые сценарии
│   ├── api/
│   │   ├── sheets/route.ts       # GET метрик из Google Sheets
│   │   └── scenarios/            # CRUD сценариев
│   ├── layout.tsx
│   └── globals.css               # бренд-токены ЛП
├── components/
│   ├── ui/                       # shadcn/ui примитивы
│   ├── charts/                   # обёртки над Recharts/ECharts
│   ├── calculators/              # конкретные калькуляторы
│   └── brand/                    # логотип, иконки ЛП
├── lib/
│   ├── firebase/                 # init, auth, firestore helpers
│   ├── sheets/                   # Google Sheets API клиент
│   ├── calculators/              # бизнес-логика расчётов (pure functions)
│   └── utils.ts
├── public/
│   ├── lemana-pro-logo.png
│   └── favicon.ico
├── docs/                         # эта документация
├── agents/                       # промпты команды
└── backlog/
```

## Модель данных (Firestore)

```
users/{uid}
  ├─ email
  ├─ displayName
  ├─ role: 'admin' | 'member'
  └─ createdAt

scenarioSets/{setId}              # группа сценариев для сравнения
  ├─ ownerId: uid
  ├─ calculatorSlug: string       # все сценарии в сете — одного калькулятора
  ├─ name: string                 # 'Новосел — анализ 2026-05'
  ├─ scenarioIds: string[]        # ссылки на scenarios/{id}
  ├─ createdAt
  └─ updatedAt

scenarios/{scenarioId}
  ├─ ownerId: uid
  ├─ setId: string | null         # null = одиночный сценарий, string = входит в сет
  ├─ calculatorSlug: string       # 'novosel-loyalty-impact', ...
  ├─ label: string                # 'Сценарий A', 'Оптимистичный', ...
  ├─ name: string                 # 'Новосел — Кухня — 25% доля — 2026-05-07'
  ├─ inputs: object               # все параметры пользователя
  ├─ baselineSnapshot: object     # снэпшот метрик из Sheets на момент сохранения
  ├─ result: object               # вычисленные значения (кешируем для быстрого сравнения)
  ├─ color: string                # цвет линии/бара на дашборде сравнения
  ├─ createdAt
  └─ updatedAt

metrics_cache/{snapshotDate}
  ├─ source: 'google-sheets'
  ├─ sheetId: string
  ├─ data: object                 # сырые значения по ячейкам
  └─ fetchedAt
```

## Ключевые архитектурные решения

1. **Расчёты — pure functions в `lib/calculators/`.** Никакого React, никакого Firebase. Это позволяет тестировать формулы юнит-тестами без моков и переиспользовать логику на сервере (API routes) и клиенте.

2. **Sheets-метрики кешируются.** При первом запросе на день — fetch из Google Sheets API, сохраняем snapshot в Firestore `metrics_cache/`. Все последующие расчёты в этот день берут из кеша. Кнопка «Обновить метрики» — форс-фетч.

3. **Сценарий хранит снэпшот baseline.** Когда пользователь сохраняет расчёт, мы записываем не только inputs, но и `baselineSnapshot` — иначе через месяц цифры в Sheets изменятся, и старый расчёт станет нерепрезентативным. Также кешируем `result` — для быстрой отрисовки сравнительного дашборда без пересчёта.

4. **Калькулятор = плагин.** Каждый калькулятор — это объект с метаданными (slug, title, description, inputs schema, formula function, chart spec). Добавление нового — без изменений в роутинге, регистрация через `lib/calculators/registry.ts`.

5. **Сценарное моделирование — платформенный стандарт.** Каждый калькулятор обязан поддерживать:
   - **Live preview:** любое изменение input → мгновенный пересчёт (debounce 300ms), результат обновляется без сохранения
   - **Сохранение сценария** с пользовательским label (A / B / C или произвольное название)
   - **Scenario Set:** объединение 2–4 сценариев одного калькулятора в группу для сравнения
   - Все сценарии отображаются на **сравнительном дашборде** — overlay линий на графиках, side-by-side таблица delta

6. **Whitelist по email.** Firestore Rules проверяют, что `request.auth.token.email` есть в списке `allowedEmails` (массив в коллекции `config/access`).

## Бренд-токены (CSS variables)

```css
:root {
  --lp-dark: #2F3738;       /* primary text, headers */
  --lp-yellow: #FDC300;     /* accent, CTA, charts highlight */
  --lp-bg: #FFFFFF;
  --lp-muted: #F5F5F5;
  --lp-border: #E5E5E5;
  --font-brand: 'Manrope', system-ui, sans-serif;
}
```

Расширение палитры под графики (нейтральные оттенки, без зелёного — гайдлайн ЛП): задаётся в `globals.css`.
