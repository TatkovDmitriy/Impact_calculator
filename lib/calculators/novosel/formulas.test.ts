import { describe, it, expect } from 'vitest';
import {
  computeScenarioA,
  computeScenarioB,
  computeScenarioC,
} from './formulas';
import type { NovoselBaseline, NovoselInputs } from './types';

// Baseline data: April 2026 actuals from C-09 spec
const MOCK_BASELINE: NovoselBaseline = {
  byCategory: {
    kitchen: {
      totalCreated: 35736,
      novoselCreated: 4179,
      novoselAov: 166299,
      nonNovoselAov: 113174,
      novoselConversion: 0.441,
      nonNovoselConversion: 0.182,
    },
    bathroom: {
      totalCreated: 27429,
      novoselCreated: 5331,
      novoselAov: 119374,
      nonNovoselAov: 92096,
      novoselConversion: 0.745,
      nonNovoselConversion: 0.437,
    },
    storage: {
      totalCreated: 20685,
      novoselCreated: 2828,
      novoselAov: 74180,
      nonNovoselAov: 44538,
      novoselConversion: 0.428,
      nonNovoselConversion: 0.285,
    },
  },
  novoselProjectsPerClient: 1.25,
  nonNovoselProjectsPerClient: 1.10,
  novoselPaidPerClient: 0.75,
  nonNovoselPaidPerClient: 0.48,
  trend: [
    {
      month: '2025-12',
      byCategory: {
        bathroom: { totalCreated: 25000, novoselCreated: 2700, novoselAov: 155605, nonNovoselAov: 107917, novoselConversion: 0.864, nonNovoselConversion: 0.641 },
        kitchen:  { totalCreated: 32000, novoselCreated: 3500, novoselAov: 160000, nonNovoselAov: 110000, novoselConversion: 0.450, nonNovoselConversion: 0.190 },
        storage:  { totalCreated: 19000, novoselCreated: 2200, novoselAov: 72000, nonNovoselAov: 43000, novoselConversion: 0.430, nonNovoselConversion: 0.290 },
      },
    },
    {
      month: '2026-04',
      byCategory: {
        bathroom: { totalCreated: 27429, novoselCreated: 5331, novoselAov: 119374, nonNovoselAov: 92096, novoselConversion: 0.745, nonNovoselConversion: 0.437 },
        kitchen:  { totalCreated: 35736, novoselCreated: 4179, novoselAov: 166299, nonNovoselAov: 113174, novoselConversion: 0.441, nonNovoselConversion: 0.182 },
        storage:  { totalCreated: 20685, novoselCreated: 2828, novoselAov: 74180, nonNovoselAov: 44538, novoselConversion: 0.428, nonNovoselConversion: 0.285 },
      },
    },
  ],
};

const BASE_INPUTS: NovoselInputs = {
  scenario: 'share-growth',
  category: 'kitchen',
  marginPct: 0.20,
  horizonMonths: 12,
  targetNovoselShare: 0.117,
  dealGrowthPct: 0,
  incrementality: 'full',
  serviceSharePct: 0,
};

// ── computeScenarioA ──────────────────────────────────────────────────────────

describe('computeScenarioA', () => {
  it('Kitchen baseline share → deltaRevenue ≈ 0 (±1%)', () => {
    // targetShare = 4179/35736 ≈ 0.117 = baseline share → near-zero delta
    const result = computeScenarioA(
      { ...BASE_INPUTS, category: 'kitchen', targetNovoselShare: 0.117 },
      MOCK_BASELINE
    );
    const relativeDelta = Math.abs(result.deltaRevenue) / result.baselineRevenue;
    expect(relativeDelta).toBeLessThan(0.01);
    expect(result.baselineRevenue).toBeGreaterThan(0);
  });

  it('Kitchen APR 2026: ROI >> 1 at 20% margin, netMargin positive (correct model)', () => {
    // Kitchen discount = min(166299 × 0.10, 40000) = 16,630 (below cap)
    // roiDiscount = scenarioGrossMargin (ALL deals) / discountCost — so it's much > 2
    // because denominator is only novosel discount while numerator includes all kitchen revenue
    const result = computeScenarioA(
      { ...BASE_INPUTS, category: 'kitchen', targetNovoselShare: 0.117, incrementality: 'full' },
      MOCK_BASELINE
    );
    expect(result.roiDiscount).toBeGreaterThan(1);
    expect(result.scenarioNetMargin).toBeGreaterThan(0);
    // discount should be ~16,630/project (10% AOV), NOT 85,000/project
    // paid ≈ 1843 projects → discountCost ≈ 30.6M, far below old 85k model (156M)
    expect(result.discountCost).toBeGreaterThan(25_000_000);
    expect(result.discountCost).toBeLessThan(40_000_000);
  });

  it('Kitchen targetShare=0.25 → scenarioRevenue > baselineRevenue', () => {
    const result = computeScenarioA(
      { ...BASE_INPUTS, category: 'kitchen', targetNovoselShare: 0.25, incrementality: 'full' },
      MOCK_BASELINE
    );
    expect(result.scenarioRevenue).toBeGreaterThan(result.baselineRevenue);
    expect(result.roiDiscount).toBeCloseTo(
      result.scenarioGrossMargin / result.discountCost,
      5
    );
  });

  it('Bathroom → warning=cap_hit (119374 × 10% = 11937 > cap 10000)', () => {
    const result = computeScenarioA(
      { ...BASE_INPUTS, category: 'bathroom' },
      MOCK_BASELINE
    );
    expect(result.warning).toBe('cap_hit');
  });

  it('Storage → no warning (74180 × 10% = 7418 < cap 10000)', () => {
    const result = computeScenarioA(
      { ...BASE_INPUTS, category: 'storage' },
      MOCK_BASELINE
    );
    expect(result.warning).toBeUndefined();
  });

  it('incrementality=none → novosel uplift zeroed, deltaRevenue < 0 (displaced non-novosel)', () => {
    // targetShare=0.25 > baseline 0.117: more deals classified as novosel
    // factor=0 → novosel revenue delta zeroed, but non-novosel pool shrinks → net negative
    const base = computeScenarioA(
      { ...BASE_INPUTS, category: 'kitchen', targetNovoselShare: 0.25, incrementality: 'none' },
      MOCK_BASELINE
    );
    expect(base.deltaRevenue).toBeLessThan(0);
    expect(base.discountCost).toBeGreaterThan(0);
  });
});

// ── computeScenarioB ──────────────────────────────────────────────────────────

describe('computeScenarioB', () => {
  it('margin=0.20 → all categories ROI > 1 (correct model)', () => {
    // Kitchen: min(166299×0.10,40000)=16630; ROI=166299×0.20/16630≈2.0
    // Bathroom: min(119374×0.10,10000)=10000; ROI=119374×0.20/10000≈2.39
    // Storage: min(74180×0.10,10000)=7418; ROI=74180×0.20/7418≈2.0
    const result = computeScenarioB(BASE_INPUTS, MOCK_BASELINE);
    for (const item of result.items) {
      expect(item.roiDiscount).toBeGreaterThan(1);
    }
  });

  it('Bathroom has highest roiDiscount at 20% margin', () => {
    const result = computeScenarioB(BASE_INPUTS, MOCK_BASELINE);
    const bathroom = result.items.find((i) => i.category === 'bathroom')!;
    expect(result.bestByRoi).toBe('bathroom');
    expect(bathroom.roiDiscount).toBeCloseTo(2.39, 1);
  });

  it('Kitchen roiDiscount ≈ 2.0 at 20% margin (CPO ROI proof)', () => {
    const result = computeScenarioB(BASE_INPUTS, MOCK_BASELINE);
    const kitchen = result.items.find((i) => i.category === 'kitchen')!;
    // min(166299×0.10, 40000) = 16630 < 40000 (below cap)
    // ROI = (166299 × 0.20) / 16630 = 33259.8 / 16630 ≈ 2.0
    expect(kitchen.roiDiscount).toBeCloseTo(2.0, 1);
    // discountCost = paid × discountPerProject = (4179 × 0.441) × 16630 ≈ 30.65M
    const expectedDiscount =
      MOCK_BASELINE.byCategory.kitchen.novoselCreated *
      MOCK_BASELINE.byCategory.kitchen.novoselConversion *
      16630;
    expect(kitchen.discountCost).toBeCloseTo(expectedDiscount, -3);
  });

  it('discountCost per project never exceeds category cap', () => {
    const result = computeScenarioB(BASE_INPUTS, MOCK_BASELINE);
    const caps: Record<string, number> = { kitchen: 40000, bathroom: 10000, storage: 10000 };
    for (const item of result.items) {
      const m = MOCK_BASELINE.byCategory[item.category as 'kitchen' | 'bathroom' | 'storage'];
      const paidProjects = m.novoselCreated * m.novoselConversion;
      const discountPerProj = paidProjects > 0 ? item.discountCost / paidProjects : 0;
      expect(discountPerProj).toBeLessThanOrEqual(caps[item.category] + 0.01);
    }
  });
});

// ── computeScenarioC ──────────────────────────────────────────────────────────

describe('computeScenarioC', () => {
  it('Kitchen aovPremiumPct ≈ 0.47 (+47%) — within ±0.01', () => {
    const result = computeScenarioC(MOCK_BASELINE);
    const kitchen = result.premiums.find((p) => p.category === 'kitchen')!;
    // (166299 / 113174) - 1 = 0.4694
    expect(kitchen.aovPremiumPct).toBeCloseTo(0.4694, 2);
  });

  it('Kitchen convLiftPp ≈ 25.9 pp — within ±0.5', () => {
    const result = computeScenarioC(MOCK_BASELINE);
    const kitchen = result.premiums.find((p) => p.category === 'kitchen')!;
    // (0.441 - 0.182) * 100 = 25.9
    expect(kitchen.convLiftPp).toBeCloseTo(25.9, 1);
  });

  it('paidPerClientLift ≈ 0.5625 (+56.25%) — Novosel clients pay more', () => {
    const result = computeScenarioC(MOCK_BASELINE);
    // 0.75 / 0.48 - 1 = 0.5625
    expect(result.clientMetrics.paidPerClientLift).toBeCloseTo(0.5625, 4);
  });

  it('trend data preserved with correct novoselShare calculation', () => {
    const result = computeScenarioC(MOCK_BASELINE);
    const apr = result.trend.find((t) => t.month === '2026-04')!;
    // Kitchen share = 4179 / 35736 ≈ 0.117
    expect(apr.byCategory.kitchen.novoselShare).toBeCloseTo(0.117, 2);
  });
});
