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
  for (const c of categories) {
    const m = baseline.byCategory[c];
    const catShare = m.totalCreated / totalCreated;
    const novoselCreatedNewC = novoselCreatedNewTotal * catShare;
    const nonNovoselCreatedNewC = m.totalCreated - novoselCreatedNewC;
    revNovNew += novoselCreatedNewC * m.novoselConversion * m.novoselAov;
    revNonNew +=
      nonNovoselCreatedNewC * m.nonNovoselConversion * m.nonNovoselAov;
    novoselPaidCount += novoselCreatedNewC * m.novoselConversion;
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

  const baselineDiscountCost = baselineNovoselPaid * inputs.discountPerProject;
  const discountCost = novoselPaidCount * inputs.discountPerProject;

  const baselineNetMargin = baselineGrossMargin - baselineDiscountCost;
  const scenarioNetMargin = scenarioGrossMargin - discountCost;
  const deltaRevenue = scenarioRevenue - baselineRevenue;
  const deltaNetMargin = scenarioNetMargin - baselineNetMargin;

  const roiDiscount =
    discountCost > 0 ? scenarioGrossMargin / discountCost : Infinity;

  // Warning: use weighted average aov_nov for 'all', single value otherwise
  let weightedAovNov: number;
  if (categories.length === 1) {
    weightedAovNov = baseline.byCategory[categories[0]].novoselAov;
  } else {
    let weightedSum = 0;
    for (const c of categories) {
      weightedSum +=
        baseline.byCategory[c].novoselCreated * baseline.byCategory[c].novoselAov;
    }
    weightedAovNov =
      novoselCreatedBaseline > 0 ? weightedSum / novoselCreatedBaseline : 0;
  }

  let warning: ScenarioAResult['warning'];
  if (weightedAovNov < inputs.discountPerProject) {
    warning = 'discount_exceeds_aov';
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
    const discountCost = novoselPaid * inputs.discountPerProject;
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
