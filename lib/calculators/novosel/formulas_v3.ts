import type {
  DiscountConfig,
  CategoryConfigV3,
  CategoryInputV3,
  HistoricalMonthRow,
  ForecastBase,
  MonthResultV3,
  CategoryResultV3,
  MonthlyAggregateV3,
  ScenarioV3Result,
} from './types_v3';
import { ALL_MONTHS_V3, FORECAST_MONTHS_SET_V3 } from './constants_v3';

// ── Pure helpers ──────────────────────────────────────────────────────────────

export function calcNovoselCreated(totalCreated: number, sharePct: number): number {
  return Math.round(totalCreated * sharePct / 100);
}

export function discountPerDeal(config: DiscountConfig, aov: number): number {
  if (config.mode === 'fixed') return config.amount;
  return Math.min(aov * config.pct / 100, config.cap);
}

// ── Month computation ─────────────────────────────────────────────────────────

function computeMonthRow(
  config: CategoryConfigV3,
  month: string,
  isForecast: boolean,
  totalCreated: number,
  sharePct: number,        // actual (historical) or target (forecast)
  novoselConvPct: number,  // 0–100
  novoselAov: number,
  nonNovoselConvPct: number, // 0–100
  nonNovoselAov: number,
): MonthResultV3 {
  const nCreated = calcNovoselCreated(totalCreated, sharePct);
  const nnCreated = totalCreated - nCreated;
  const nPaid = Math.round(nCreated * novoselConvPct / 100);
  const nnPaid = Math.round(nnCreated * nonNovoselConvPct / 100);
  const nRevenue = nPaid * novoselAov;
  const nnRevenue = nnPaid * nonNovoselAov;
  const gmv = nRevenue + nnRevenue;
  const margin = gmv * config.marginPct / 100;
  const dpd = discountPerDeal(config.discount, novoselAov);
  const discountCost = nPaid * dpd;
  const netMargin = margin - discountCost;

  return {
    month,
    isForecast,
    totalCreated,
    novoselCreated: nCreated,
    nonNovoselCreated: nnCreated,
    novoselSharePct: sharePct,
    novoselPaid: nPaid,
    nonNovoselPaid: nnPaid,
    novoselRevenue: nRevenue,
    nonNovoselRevenue: nnRevenue,
    gmv,
    margin,
    discountCost,
    netMargin,
    discountPerDeal: dpd,
  };
}

// ── Category computation ──────────────────────────────────────────────────────

export function computeCategory(input: CategoryInputV3): CategoryResultV3 {
  const { config, historical, forecastBase } = input;
  const histMap = new Map<string, HistoricalMonthRow>(
    historical.map((h) => [h.month, h]),
  );

  const months: MonthResultV3[] = ALL_MONTHS_V3.map((month) => {
    const isForecast = FORECAST_MONTHS_SET_V3.has(month);

    if (!isForecast) {
      const row = histMap.get(month);
      if (row) {
        return computeMonthRow(
          config, month, false,
          row.totalCreated, row.novoselSharePct,
          row.novoselConvPct, row.novoselAov,
          row.nonNovoselConvPct, row.nonNovoselAov,
        );
      }
    }

    // Forecast: Apr 2026 base volumes + targetNovoselSharePct
    return computeMonthRow(
      config, month, true,
      forecastBase.totalCreated, config.targetNovoselSharePct,
      forecastBase.novoselConvPct, forecastBase.novoselAov,
      forecastBase.nonNovoselConvPct, forecastBase.nonNovoselAov,
    );
  });

  const totals = months.reduce(
    (acc, m) => ({
      gmv: acc.gmv + m.gmv,
      margin: acc.margin + m.margin,
      discountCost: acc.discountCost + m.discountCost,
      netMargin: acc.netMargin + m.netMargin,
    }),
    { gmv: 0, margin: 0, discountCost: 0, netMargin: 0 },
  );

  return { categoryId: config.id, categoryName: config.name, months, totals };
}

// ── Scenario computation ──────────────────────────────────────────────────────

export function computePlannerV3(inputs: CategoryInputV3[]): ScenarioV3Result {
  const categories = inputs.map(computeCategory);

  const monthMap = new Map<string, MonthlyAggregateV3>();
  for (const cat of categories) {
    for (const m of cat.months) {
      if (!monthMap.has(m.month)) {
        monthMap.set(m.month, {
          month: m.month,
          isForecast: m.isForecast,
          gmv: 0, margin: 0, discountCost: 0, netMargin: 0,
        });
      }
      const agg = monthMap.get(m.month)!;
      agg.gmv += m.gmv;
      agg.margin += m.margin;
      agg.discountCost += m.discountCost;
      agg.netMargin += m.netMargin;
    }
  }

  const monthly: MonthlyAggregateV3[] = ALL_MONTHS_V3.map(
    (mo) =>
      monthMap.get(mo) ?? {
        month: mo,
        isForecast: FORECAST_MONTHS_SET_V3.has(mo),
        gmv: 0, margin: 0, discountCost: 0, netMargin: 0,
      },
  );

  const grandTotal = categories.reduce(
    (acc, c) => ({
      gmv: acc.gmv + c.totals.gmv,
      margin: acc.margin + c.totals.margin,
      discountCost: acc.discountCost + c.totals.discountCost,
      netMargin: acc.netMargin + c.totals.netMargin,
    }),
    { gmv: 0, margin: 0, discountCost: 0, netMargin: 0 },
  );

  return { categories, monthly, grandTotal };
}
