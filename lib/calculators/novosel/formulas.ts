import type {
  NovoselInputs,
  NovoselBaseline,
  ScenarioAResult,
  ScenarioBResult,
  ScenarioCResult,
  CategoryCompareItem,
  Category,
} from './types';

const ALL_CATEGORIES: Category[] = ['bathroom', 'kitchen', 'storage'];

// Real program caps from official rules (01.04.2026)
const DISCOUNT_CAPS: Record<Category, number> = {
  kitchen: 40_000,
  bathroom: 10_000,  // ×2 promos per client = up to 20,000/client, but 10k per project
  storage: 10_000,
};

function discountPerProject(category: Category, aov: number): number {
  return Math.min(aov * 0.10, DISCOUNT_CAPS[category]);
}

export function computeScenarioA(
  inputs: NovoselInputs,
  baseline: NovoselBaseline
): ScenarioAResult {
  const categories: Category[] =
    inputs.category === 'all' ? ALL_CATEGORIES : [inputs.category as Category];

  // Aggregate baseline totals across selected categories
  let totalCreated = 0;
  let novoselCreatedBaseline = 0;
  for (const c of categories) {
    totalCreated += baseline.byCategory[c].totalCreated;
    novoselCreatedBaseline += baseline.byCategory[c].novoselCreated;
  }

  // Baseline revenue: sum per-category (preserves individual conv/aov rates)
  let revNovBase = 0;
  let revNonBase = 0;
  let baselineNovoselPaid = 0;
  for (const c of categories) {
    const m = baseline.byCategory[c];
    revNovBase += m.novoselCreated * m.novoselConversion * m.novoselAov;
    revNonBase +=
      (m.totalCreated - m.novoselCreated) *
      m.nonNovoselConversion *
      m.nonNovoselAov;
    baselineNovoselPaid += m.novoselCreated * m.novoselConversion;
  }
  const baselineRevenue = revNovBase + revNonBase;

  // Scenario: distribute new novosel count proportionally by each category's
  // share of total created deals (so each category gets targetShare)
  const novoselCreatedNewTotal = totalCreated * inputs.targetNovoselShare;
  let revNovNew = 0;
  let revNonNew = 0;
  let novoselPaidCount = 0;
  let discountCost = 0;
  let baselineDiscountCost = 0;
  for (const c of categories) {
    const m = baseline.byCategory[c];
    const capDiscount = discountPerProject(c, m.novoselAov);
    const catShare = m.totalCreated / totalCreated;
    const novoselCreatedNewC = novoselCreatedNewTotal * catShare;
    const nonNovoselCreatedNewC = m.totalCreated - novoselCreatedNewC;
    const paidNewC = novoselCreatedNewC * m.novoselConversion;
    revNovNew += novoselCreatedNewC * m.novoselConversion * m.novoselAov;
    revNonNew += nonNovoselCreatedNewC * m.nonNovoselConversion * m.nonNovoselAov;
    novoselPaidCount += paidNewC;
    discountCost += paidNewC * capDiscount;
    baselineDiscountCost += m.novoselCreated * m.novoselConversion * capDiscount;
  }

  // Apply incrementality factor to the novosel revenue delta
  const factor =
    inputs.incrementality === 'full'
      ? 1.0
      : inputs.incrementality === 'half'
        ? 0.5
        : 0.0;
  const incrementalRevDelta = (revNovNew - revNovBase) * factor;
  const scenarioRevenue = revNonNew + revNovBase + incrementalRevDelta;

  // Margin and discount calculations
  const baselineGrossMargin = baselineRevenue * inputs.marginPct;
  const scenarioGrossMargin = scenarioRevenue * inputs.marginPct;

  const baselineNetMargin = baselineGrossMargin - baselineDiscountCost;
  const scenarioNetMargin = scenarioGrossMargin - discountCost;
  const deltaRevenue = scenarioRevenue - baselineRevenue;
  const deltaNetMargin = scenarioNetMargin - baselineNetMargin;

  const roiDiscount =
    discountCost > 0 ? scenarioGrossMargin / discountCost : Infinity;

  // Cap-hit: any selected category where 10% AOV exceeds its cap
  const capHit = categories.some(
    (c) => baseline.byCategory[c].novoselAov * 0.10 > DISCOUNT_CAPS[c]
  );

  let warning: ScenarioAResult['warning'];
  if (capHit) {
    warning = 'cap_hit';
  } else if (roiDiscount < 1) {
    warning = 'roi_negative';
  }

  return {
    baselineRevenue,
    scenarioRevenue,
    deltaRevenue,
    baselineGrossMargin,
    scenarioGrossMargin,
    discountCost,
    baselineNetMargin,
    scenarioNetMargin,
    deltaNetMargin,
    roiDiscount,
    novoselPaidCount,
    warning,
  };
}

export function computeScenarioB(
  inputs: NovoselInputs,
  baseline: NovoselBaseline
): ScenarioBResult {
  const items: CategoryCompareItem[] = ALL_CATEGORIES.map((c) => {
    const m = baseline.byCategory[c];
    const novoselPaid = m.novoselCreated * m.novoselConversion;
    const novoselRevenue = novoselPaid * m.novoselAov;
    const grossMargin = novoselRevenue * inputs.marginPct;
    const capDiscount = discountPerProject(c, m.novoselAov);
    const discountCost = novoselPaid * capDiscount;
    const netMargin = grossMargin - discountCost;
    const netMarginPerDeal =
      m.novoselCreated > 0 ? netMargin / m.novoselCreated : 0;
    const roiDiscount =
      discountCost > 0 ? grossMargin / discountCost : Infinity;
    return {
      category: c,
      novoselRevenue,
      grossMargin,
      discountCost,
      netMargin,
      netMarginPerDeal,
      roiDiscount,
    };
  });

  const bestByNetMargin = items.reduce((best, cur) =>
    cur.netMargin > best.netMargin ? cur : best
  ).category;

  const bestByRoi = items.reduce((best, cur) =>
    cur.roiDiscount > best.roiDiscount ? cur : best
  ).category;

  return { items, bestByNetMargin, bestByRoi };
}

export function computeScenarioC(baseline: NovoselBaseline): ScenarioCResult {
  const premiums = ALL_CATEGORIES.map((c) => {
    const m = baseline.byCategory[c];
    const aovPremiumPct = m.novoselAov / m.nonNovoselAov - 1;
    const convLiftPp = (m.novoselConversion - m.nonNovoselConversion) * 100;
    const revenuePerDealNovosel = m.novoselConversion * m.novoselAov;
    const revenuePerDealNonNovosel = m.nonNovoselConversion * m.nonNovoselAov;
    const revenuePerDealPremiumPct =
      revenuePerDealNonNovosel > 0
        ? revenuePerDealNovosel / revenuePerDealNonNovosel - 1
        : 0;
    return {
      category: c,
      aovPremiumPct,
      convLiftPp,
      revenuePerDealPremiumPct,
      revenuePerDealNovosel,
      revenuePerDealNonNovosel,
    };
  });

  const clientMetrics = {
    projectsPerClientLift:
      baseline.novoselProjectsPerClient / baseline.nonNovoselProjectsPerClient - 1,
    paidPerClientLift:
      baseline.novoselPaidPerClient / baseline.nonNovoselPaidPerClient - 1,
    novoselProjectsPerClient: baseline.novoselProjectsPerClient,
    nonNovoselProjectsPerClient: baseline.nonNovoselProjectsPerClient,
  };

  const trend = baseline.trend.map(({ month, byCategory }) => ({
    month,
    byCategory: ALL_CATEGORIES.reduce(
      (acc, c) => {
        const m = byCategory[c];
        acc[c] = {
          novoselAov: m.novoselAov,
          nonNovoselAov: m.nonNovoselAov,
          novoselConversion: m.novoselConversion,
          nonNovoselConversion: m.nonNovoselConversion,
          novoselShare:
            m.totalCreated > 0 ? m.novoselCreated / m.totalCreated : 0,
        };
        return acc;
      },
      {} as ScenarioCResult['trend'][number]['byCategory']
    ),
  }));

  return { premiums, clientMetrics, trend };
}
