# 00 — Бэклог Impact Calculator

> Приоритизация по RICE: Reach × Impact × Confidence / Effort.
>
> Reach — сколько питчей/расчётов в квартал использует калькулятор.
> Impact: 0.25 / 0.5 / 1 / 2 / 3 (minimal → massive).
> Confidence: 0.5 / 0.8 / 1.0.
> Effort — человеко-недели.

## Эпики

### EPIC-1: Платформа (фундамент)
- [ ] **PLAT-01** — Next.js scaffold + бренд-тема ЛП — *2н, P0*
- [ ] **PLAT-02** — Firebase setup (Auth + Firestore + Rules) — *1н, P0*
- [ ] **PLAT-03** — Google Sheets API клиент + кеш в Firestore — *1н, P0*
- [ ] **PLAT-04** — Calculators registry + типы — *0.5н, P0*
- [ ] **PLAT-05** — Дашборд (KPI + trend chart + recent scenarios) — *1.5н, P0*
- [ ] **PLAT-06** — Сохранение/просмотр сценариев — *1н, P0*
- [ ] **PLAT-07** — Vercel deploy + CD — *0.5н, P0*

### EPIC-2: Калькуляторы

#### C-09 — Новосел (ПЕРВЫЙ К РАЗРАБОТКЕ, ждёт PLAT-01..07)

- Slug: `novosel-loyalty-impact`
- Спека: [docs/calculators/C-09_novosel_loyalty.md](../docs/calculators/C-09_novosel_loyalty.md)
- RICE: Reach=10, Impact=3, Conf=1.0, Effort=2н → **RICE=15** (effort выше из-за 3 сценариев + ECharts)
- Статус: [ ] ТЗ DEV → [ ] DEV → [ ] QA → [ ] Prod

#### Следующие калькуляторы (очередь после C-09)

| # | Slug | Reach | Impact | Conf | Effort (н) | RICE | Приоритет |
|---|---|---|---|---|---|---|---|
| C-01 | revenue-uplift | 10 | 3 | 1.0 | 1.0 | **30** | P0 |
| C-02 | conversion-funnel | 10 | 2 | 1.0 | 1.0 | **20** | P0 |
| C-03 | aov-uplift | 8 | 2 | 0.8 | 0.5 | **25.6** | P1 |
| C-04 | nps-revenue | 6 | 2 | 0.5 | 1.5 | **4** | P1 |
| C-05 | downtime-cost | 4 | 3 | 0.8 | 0.5 | **19.2** | P1 |
| C-06 | vendor-switch-roi | 3 | 3 | 0.5 | 1.5 | **3** | P2 |
| C-07 | partner-network-roi | 4 | 3 | 0.5 | 1.0 | **6** | P2 |
| C-08 | cx-rescue-roi | 3 | 2 | 0.8 | 0.5 | **9.6** | P2 |

> ⚠️ RICE-баллы — черновые, PM пересчитывает после первого использования каждого калькулятора в реальном питче.

### EPIC-3: Pitch-mode (post-MVP)
- [ ] **PITCH-01** — Экспорт сценария в PDF с брендингом
- [ ] **PITCH-02** — Презентационный режим (full-screen с проигрыванием анимаций по клику)
- [ ] **PITCH-03** — Compare scenarios — две колонки бок-о-бок

### EPIC-4: Платформенные улучшения
- [ ] **PLAT-08** — Импорт BI-данных через CSV (если Sheets API упрётся в лимиты)
- [ ] **PLAT-09** — Шаблоны сценариев (стартовать новый расчёт от существующего)
- [ ] **PLAT-10** — Annotations на графиках (комментарии к точкам)

## Tech debt
- [ ] TBD (заполняется DEV по мере появления)

## Известные баги
- [ ] TBD (заполняется QA)

## История
- **2026-05-07** — Бэклог создан. PM-черновик RICE.
