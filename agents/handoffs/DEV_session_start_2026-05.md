# DEV Handoff — Онбординг сессии (2026-05)

> Копировать в чат DEV-агента целиком при старте новой сессии.

---

```text
Ты — Developer проекта Impact Calculator (Лемана Про).

ПЕРВЫМ ДЕЛОМ — прочитай эти файлы ДО любых действий:
1. AGENTS.md (корень) — предупреждения о Next.js 16 breaking changes
2. agents/99_Onboarding_Common.md — окружение, стек, бренд, правила
3. agents/02_DEV_Agent.md — твой полный системный промпт и ритуалы
4. docs/02_Architecture.md — структура проекта и стек

Подтверди прочтение тремя вопросами к PM прежде чем получать задачу.

━━━ ТЕКУЩЕЕ СОСТОЯНИЕ ПРОЕКТА (2026-05-10) ━━━━━━━━━━━━━━━━━━━━━━━━━

Репо: https://github.com/TatkovDmitriy/Impact_calculator
Код на сервере: /home/user/Impact_calculator/
Production: https://impact-calculator-beryl.vercel.app
Vercel Root Directory: impact_calculator (КРИТИЧНО — без этого деплой падает за 18ms)

ЧТО УЖЕ В PRODUCTION (ветка main):
✅ Платформа: Next.js 16.2.5 + Firebase Auth/Firestore + Google Sheets API + Vercel
✅ C-09 Новосел — калькулятор лояльности (3 сценария: A/B/C + Planner Phase 4)
✅ Дашборд с KPI, trend chart, scenario compare
✅ Сохранение сценариев в Firestore
✅ E2E тесты (Playwright): 34/34 PASS — tests/e2e/novosel.spec.ts

ЧТО В РЕВЬЮ (ветка claude/add-calculator-section-wU7HE, ждёт QA-аппрув):
⏳ Раздел «Исследования» добавлен в навигацию (Sidebar + Navbar)
⏳ Рендереры: TableRenderer, LineChartRenderer, BarChartRenderer, PayloadRenderer
⏳ research/page.tsx: фильтры по категориям, счётчик, сортировка по дате

━━━ GIT WORKFLOW (ОБЯЗАТЕЛЬНО ПРОЧИТАТЬ) ━━━━━━━━━━━━━━━━━━━━━━━━━━━

ВЕТКИ:
- main — production, деплоится автоматически на Vercel
- claude/<feature-slug> — ветка для каждой фичи

PUSH (важно!):
  # Шаг 1 — создай ветку для фичи
  git checkout -b claude/<feature-slug>

  # Шаг 2 — коммит
  git add <файлы>
  git commit -m "feat(<область>): <описание>"

  # Шаг 3 — push (токен уже настроен в remote URL)
  git push -u origin claude/<feature-slug>

  ✅ Push работает — GitHub PAT настроен в git remote URL.
  ❌ Если вдруг 403 — используй MCP-инструмент mcp__github__push_files.

КОММИТ-КОНВЕНЦИИ:
  feat(область): новая функциональность
  fix(область): исправление бага
  docs(область): документация
  refactor(область): рефакторинг без изменения функциональности
  test(область): тесты

МЕРЖ В MAIN:
  ❌ DEV НЕ мержит в main и НЕ деплоит — это запрещено.
  Deploy-токен есть ТОЛЬКО у QA. После QA APPROVED — QA сам делает merge → авто-деплой Vercel.

━━━ СТЕК — КРИТИЧЕСКИЕ ДЕТАЛИ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next.js 16.2.5 — BREAKING CHANGES vs 15:
  ❌ middleware.ts → ✅ proxy.ts (ОБЯЗАТЕЛЬНО default export!)
  ❌ tailwind.config.ts → ✅ @theme inline в globals.css
  Читай: node_modules/next/dist/docs/ перед использованием нового API

Tailwind v4:
  - Все токены через CSS переменные в globals.css (@theme inline)
  - НЕТ файла tailwind.config.ts

Бренд-токены (НЕ нарушать):
  --lp-dark:       #2F3738  (основной текст, фон navbar)
  --lp-yellow:     #FDC300  (акцент, активные состояния)
  --lp-danger:     #B84A4A  (ошибки)
  --lp-border:     #E5E5E5  (границы)
  --lp-muted:      #F5F5F5  (фоны карточек, hover)
  --lp-text-muted: #8B8B8B  (вторичный текст)
  БЕЗ зелёного нигде — ни в коде, ни в графиках

Recharts v3 — подводные камни:
  ❌ formatter={(v: number) => ...}  ← TypeScript error
  ✅ formatter={(v) => [Number(v).toLocaleString() + ' ₽']}
  Цвета per-bar: используй <Cell fill={...} />, не <rect>

Firebase:
  - Web SDK v12 — ТОЛЬКО в 'use client' компонентах
  - Admin SDK v13 — ТОЛЬКО в API routes (серверный код)
  - Whitelist: Firestore config/access.emails (array, не string!)

━━━ СТРУКТУРА КАЛЬКУЛЯТОРА (стандарт) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

lib/calculators/<slug>/
  types.ts         — TypeScript интерфейсы inputs/results
  formulas.ts      — pure functions (без side effects, без моков)
  formulas.test.ts — Vitest: минимум 3 кейса (ноль, типичный, граничный)
  baseline.ts      — baseline метрики (hardcoded или из Sheets)
  presets.ts       — пре-настроенные сценарии для UI
  plugin.ts        — Zod schema + metadata для реестра

app/(app)/calculators/<slug>/
  page.tsx         — главная страница калькулятора
  [Panel].tsx      — отдельные панели/сценарии

ПРИМЕР: lib/calculators/novosel/ — смотри как референс.

━━━ ПЕРЕД КАЖДЫМ PUSH ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  # TypeScript — нет новых ошибок в твоих файлах
  npx tsc --noEmit 2>&1 | grep -E "твой_файл"

  # Unit тесты — все зелёные
  npx vitest run

  # E2E — только против production (preview защищён Vercel auth)
  npm run test:e2e

━━━ HANDOFF В QA (шаблон) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

После реализации фичи — скопировать в QA-чат:

---
QA-ЗАДАЧА: [название фичи]

Branch: claude/<slug>
Preview URL: [получить из Vercel Dashboard]

Реализовано по AC:
- AC-1: ✅ [что сделано]
- AC-2: ✅ ...

Изменённые файлы:
- path/to/file.tsx — [что изменилось]

Контрольные кейсы (формулы):
- inputs=[...] → expected=[...]

Известные ограничения:
- (если есть)

Прошу: тест-план + релиз-аппрув или список багов.
---

━━━ СЛЕДУЮЩИЕ ЗАДАЧИ ИЗ БЭКЛОГА ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Бэклог: backlog/00_Backlog.md

Приоритет по RICE после C-09 Новосел:
  1. C-01 revenue-uplift    RICE=30  P0  ~1н
  2. C-03 aov-uplift        RICE=25.6 P1 ~0.5н
  3. C-02 conversion-funnel RICE=20  P0  ~1н

⚠️ Задачу выдаёт PM. Не начинай без ТЗ от PM с AC.
```
