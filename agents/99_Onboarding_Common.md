# 99 — Общий онбординг для всех агентов

> Этот файл читают все агенты (PM/DEV/QA) ПЕРЕД стартом любой задачи.

## Что за проект

**Impact Calculator** — внутренний веб-инструмент для расчёта бизнес-импакта фич Лемана Про. Его делает Дмитрий Татьков (РП в ЛП) для подготовки питчей CPO Сукновалова и аргументации в Demand-management комитете. См. [docs/01_Overview.md](../docs/01_Overview.md).

## Кто заказчик

- **Дмитрий Татьков** — РП в Лемана Про, готовит стратегию 2026–2028.
- email: dmtat924@gmail.com
- Главный канал: чат Claude Code, где запущен PM-агент (Агент 0).

## Где что лежит

| Сущность | Путь |
|---|---|
| Код | `d:\claude code\vs code\My Project\impact_calculator\` |
| Документация (canonical) | `impact_calculator/docs/` |
| Документация (зеркало в Obsidian) | `D:\Obsidian\...\Pet_Projects\Impact_Calculator\` |
| GitHub | https://github.com/TatkovDmitriy/Impact_calculator |
| Источник метрик | https://docs.google.com/spreadsheets/d/103C2StHfJg9LPr9QFB4xmwkqLc_6pPoZT7_CKo3DuwE/edit |
| Стратегические документы ЛП | `D:\Obsidian\Lemana_Pro_Project\Lemana_Pro_Project\10_Projects\Lemana Pro\...\Lemana_Pro_Strategy_2026_2028\` |

## Команда

| Агент | Где | Промпт |
|---|---|---|
| PM (Агент 0) | Главный чат с Дмитрием | [01_PM_Agent.md](01_PM_Agent.md) |
| DEV | Отдельный чат | [02_DEV_Agent.md](02_DEV_Agent.md) |
| QA | Отдельный чат | [03_QA_Agent.md](03_QA_Agent.md) |

Workflow: Дмитрий → PM → DEV → QA → PM → Дмитрий. См. [00_Agents_Team.md](00_Agents_Team.md).

## Стек (must know)

- **Frontend:** Next.js 15 (App Router) + TypeScript strict + Tailwind + shadcn/ui
- **Графики:** Recharts (простые) + ECharts (сложные) + Framer Motion (анимации)
- **Backend:** Next.js API routes + Firebase Admin SDK
- **DB / Auth:** Firebase (Firestore + Email/Password Auth с whitelist)
- **Источник метрик:** Google Sheets API v4 через Service Account
- **Hosting:** Vercel
- **Тесты:** Vitest для формул

## Бренд (НЕ нарушать)

- **Палитра:** `#2F3738` (тёмный) + `#FDC300` (жёлтый акцент). НЕТ зелёному.
- **Шрифт:** Manrope (fallback для корпоративного LM Main).
- **Логотип:** `public/lemana-pro-logo.png`.
- **Графики:** базируются на этой палитре + нейтральные оттенки серого.

## Обязательные правила

1. **PM делегирует, не выполняет.** PM не пишет код и не тестирует руками.
2. **DEV не выкатывает без QA.** Релиз только после QA-аппрува.
3. **Арифметика проверяется независимо.** PM перепроверяет RICE/ROI вручную; QA пересчитывает формулы на 2-3 кейсах.
4. **Снэпшот baseline в каждом сценарии.** При сохранении расчёта — копируем срез метрик из Sheets, чтобы старые сценарии не "плыли".
5. **Никаких секретов в коде.** `.env.local` в `.gitignore`. Все ключи — в Vercel env vars.
6. **TypeScript strict.** Никаких `any` в production-коде.
7. **Чёткая маркировка адресата ТЗ.** Заголовок секции + код-шапка + маршрутизационная таблица если несколько ТЗ.

## Чек-лист "первое касание проекта" (для нового агента)

- [ ] Прочитал [01_Overview.md](../docs/01_Overview.md)
- [ ] Прочитал [02_Architecture.md](../docs/02_Architecture.md)
- [ ] Прочитал свой агентский промпт (PM/DEV/QA)
- [ ] Понял workflow PM → DEV → QA
- [ ] Понял бренд-токены ЛП
- [ ] Знаю, где задавать вопросы (PM в главном чате)

## Связь со стратегией ЛП

Калькуляторы напрямую питают ключевые документы стратегии 2026–2028:
- [03_Feature_Backlog_RICE.md](D:/Obsidian/Lemana_Pro_Project/Lemana_Pro_Project/10_Projects/Lemana%20Pro/Стратегия%20развития%20цифровых%20продуктов%20Лемана%20Про/Lemana_Pro_Strategy_2026_2028/03_Product_Vision_and_AI/03_Feature_Backlog_RICE.md) — Impact-колонка
- [02_ROI_Models.md](D:/Obsidian/Lemana_Pro_Project/Lemana_Pro_Project/10_Projects/Lemana%20Pro/Стратегия%20развития%20цифровых%20продуктов%20Лемана%20Про/Lemana_Pro_Strategy_2026_2028/04_Financial_and_Risks/02_ROI_Models.md) — unit-экономика
- [02_Pitch_Storyline.md](D:/Obsidian/Lemana_Pro_Project/Lemana_Pro_Project/10_Projects/Lemana%20Pro/Стратегия%20развития%20цифровых%20продуктов%20Лемана%20Про/Lemana_Pro_Strategy_2026_2028/05_Executive_Pitch_Roadmap/02_Pitch_Storyline.md) — числа в шагах 1–3 питча CPO
