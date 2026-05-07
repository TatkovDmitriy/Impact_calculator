# 05 — Источник метрик: Google Sheets

## Таблица

- **URL:** https://docs.google.com/spreadsheets/d/103C2StHfJg9LPr9QFB4xmwkqLc_6pPoZT7_CKo3DuwE/edit
- **Sheet ID:** `103C2StHfJg9LPr9QFB4xmwkqLc_6pPoZT7_CKo3DuwE`
- **Owner:** Дмитрий Татьков
- **Доступ для приложения:** Service Account (Viewer)

## Принцип

Google Sheets — **единственный источник правды** для baseline-метрик. Все калькуляторы тянут baseline отсюда. Если в таблице цифра меняется — все новые расчёты автоматически используют новое значение. Старые сценарии хранят `baselineSnapshot` и не пересчитываются.

## Структура таблицы

> ⚠️ **TBD — заполнить после изучения текущего вида таблицы.** Дмитрий уточнит, какие листы есть и какая у них структура (или мы под неё подстроим формулы калькуляторов).

Ожидаемый формат (PM-предположение, согласовать):

| Лист | Назначение | Формат |
|---|---|---|
| `Metrics_RU` | Метрики российского ЛП на 2026 (выручка, маржа, AOV, NPS, конверсии) | вертикальный: метрика \| значение \| период \| источник |
| `Funnel` | Воронки конверсий по продуктовым линиям | колонки: этап \| pct \| абс \| период |
| `Tools_Inventory` | Текущие digital-инструменты ЛП (планировщики, AR, и т.д.) с метриками использования | как в [Tools_Inventory.md](D:/Obsidian/Lemana_Pro_Project/Lemana_Pro_Project/10_Projects/Lemana%20Pro/Стратегия%20развития%20цифровых%20продуктов%20Лемана%20Про/Lemana_Pro_Strategy_2026_2028/02_LP_Internal/Current_Tools/01_Tools_Inventory.md) |
| `Project_Sales` | Метрики проектных продаж по сегментам (Кухни, Ванные, Полы, и т.д.) | сегмент \| AOV \| количество \| маржа |

## API-доступ

Используем **Google Sheets API v4** через `googleapis` npm-пакет. Аутентификация — Service Account (см. [04_Vercel_Deploy.md](04_Vercel_Deploy.md)).

### Серверный клиент

`lib/sheets/client.ts`:

```typescript
import { google } from 'googleapis';

export function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return google.sheets({ version: 'v4', auth });
}

export async function fetchRange(range: string) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    range,
  });
  return res.data.values ?? [];
}
```

## Стратегия кеширования

1. **First read in a day** — fetch из Sheets API, сохранить в Firestore `metrics_cache/{YYYY-MM-DD}`
2. **Subsequent reads** — читаем из Firestore (быстрее + экономия квоты Sheets API)
3. **Force refresh** — кнопка в UI «Обновить метрики» — пере-фетч и перезапись `metrics_cache` за сегодня
4. **Сценарий сохраняется со снэпшотом** — в `scenarios/{id}.baselineSnapshot` копируется тот срез, что использовался при расчёте

## Маппинг метрик ↔ калькуляторы

В `lib/sheets/schema.ts` определяем типизированный маппинг: какая ячейка таблицы → какое поле в `BaselineMetrics`. Это единое место правды для разработчика.

Пример:

```typescript
export const SHEET_RANGES = {
  totalRevenue2026: { range: 'Metrics_RU!B2', type: 'number' },
  averageOrderValue: { range: 'Metrics_RU!B3', type: 'number' },
  conversionLanding: { range: 'Funnel!B5', type: 'percent' },
  // ...
} as const;
```

Каждый калькулятор подписан на конкретные ключи и при отсутствии данных выводит понятное «Нет baseline для метрики X — заполни ячейку Y в таблице».
