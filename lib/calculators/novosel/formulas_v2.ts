import type {
  DiscountConfig,
  CategoryConfig,
  CategoryMonthData,
  CategoryInput,
  CategoryMonthResult,
  CategoryResult,
  MonthlyAggregate,
  ScenarioV2Result,
} from './types_v2';
import { ALL_MONTHS, FORECAST_MONTHS_SET } from './constants_v2';

export function discountPerProject(config: DiscountConfig, novoselAov: number): number {
  if (config.mode === 'fixed') return config.amount;
  return Math.min(novoselAov * config.pct / 100, config.cap);
}

export function computeCategoryMonth(
  config: CategoryConfig,
  monthData: CategoryMonthData,
): CategoryMonthResult {
  const nPaid = Math.round(monthData.novosel.created * monthData.novosel.convPct / 100);
  const nnPaid = Math.round(monthData.nonNovosel.created * monthData.nonNovosel.convPct / 100);
  const nRevenue = nPaid * monthData.novosel.aov;
  const nnRevenue = nnPaid * monthData.nonNovosel.aov;
  const gmv = nRevenue + nnRevenue;
  const margin = gmv * config.marginPct / 100;
  const dpj = discountPerProject(config.discount, monthData.novosel.aov);
  const discountCost = nPaid * dpj;
  const netMargin = margin - discountCost;

  return {
    month: monthData.month,
    isForecast: monthData.isForecast,
    novosel: { paid: nPaid, revenue: nRevenue },
    nonNovosel: { paid: nnPaid, revenue: nnRevenue },
    gmv,
    margin,
    discountCost,
    netMargin,
    discountPerProject: dpj,
  };
}

export function computeScenario(inputs: CategoryInput[]): ScenarioV2Result {
  const categories: CategoryResult[] = inputs.map((input) => {
    const months = input.months.map((m) => computeCategoryMonth(input.config, m));
    const totals = months.reduce(
      (acc, m) => ({
        gmv: acc.gmv + m.gmv,
        margin: acc.margin + m.margin,
        discountCost: acc.discountCost + m.discountCost,
        netMargin: acc.netMargin + m.netMargin,
      }),
      { gmv: 0, margin: 0, discountCost: 0, netMargin: 0 },
    );
    return { categoryId: input.config.id, categoryName: input.config.name, months, totals };
  });

  const monthMap = new Map<string, MonthlyAggregate>();
  for (const cat of categories) {
    for (const m of cat.months) {
      if (!monthMap.has(m.month)) {
        monthMap.set(m.month, {
          month: m.month,
          isForecast: m.isForecast,
          gmv: 0, margin: 0, discountCost: 0, netMargin: 0,
          byCategory: {},
        });
      }
      const agg = monthMap.get(m.month)!;
      agg.gmv += m.gmv;
      agg.margin += m.margin;
      agg.discountCost += m.discountCost;
      agg.netMargin += m.netMargin;
      agg.byCategory[cat.categoryId] = (agg.byCategory[cat.categoryId] ?? 0) + m.gmv;
    }
  }

  const monthly: MonthlyAggregate[] = ALL_MONTHS.map((mo) =>
    monthMap.get(mo) ?? {
      month: mo,
      isForecast: FORECAST_MONTHS_SET.has(mo),
      gmv: 0, margin: 0, discountCost: 0, netMargin: 0,
      byCategory: {},
    }
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
