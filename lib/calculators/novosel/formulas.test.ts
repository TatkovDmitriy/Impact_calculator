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
  discountPerProject: 85000,
  horizonMonths: 12,
  targetNovoselShare: 0.117,
  dealGrowthPct: 0,
  incrementality: 'full',
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
    expect(relativeDelta).toBeLessThan(0.01); // < 1% delta
    expect(result.baselineRevenue).toBeGreaterThan(0);
  });

  it('Kitchen targetShare=0.25 → scenarioRevenue > baselineRevenue, roiDiscount computed', () => {
    const result = computeScenarioA(
      { ...BASE_INPUTS, category: 'kitchen', targetNovoselShare: 0.25, incrementality: 'full' },
      MOCK_BASELINE
    );
    expect(result.scenarioRevenue).toBeGreaterThan(result.baselineRevenue);
    expect(result.roiDiscount).toBeGreaterThan(0);
    expect(result.discountCost).toBeGreaterThan(0);
    // roiDiscount = scenarioGrossMargin / discountCost
    expect(result.roiDiscount).toBeCloseTo(
      result.scenarioGrossMargin / result.discountCost,
      5
    );
  });

  it('Storage discount=85000 → warning=discount_exceeds_aov (aov 74180 < 85000)', () => {
    const result = computeScenarioA(
      { ...BASE_INPUTS, category: 'storage', discountPerProject: 85000 },
      MOCK_BASELINE
    );
    expect(result.warning).toBe('discount_exceeds_aov');
  });
});

// ── computeScenarioB ──────────────────────────────────────────────────────────

describe('computeScenarioB', () => {
  it('margin=0.20 discount=85000 → bestByRoi is not Storage (Storage roi ≈ 0.17)', () => {
    const result = computeScenarioB(
      { ...BASE_INPUTS, marginPct: 0.20, discountPerProject: 85000 },
      MOCK_BASELINE
    );
    const storageItem = result.items.find((i) => i.category === 'storage')!;
    expect(storageItem.roiDiscount).toBeLessThan(1);
    expect(result.bestByRoi).not.toBe('storage');
    // Kitchen should have highest roi among the three
    const kitchenItem = result.items.find((i) => i.category === 'kitchen')!;
    expect(kitchenItem.roiDiscount).toBeGreaterThan(storageItem.roiDiscount);
  });

  it('discount=0 → netMargin === grossMargin for all categories', () => {
    const result = computeScenarioB(
      { ...BASE_INPUTS, discountPerProject: 0 },
      MOCK_BASELINE
    );
    for (const item of result.items) {
      expect(item.netMargin).toBeCloseTo(item.grossMargin, 5);
      expect(item.discountCost).toBe(0);
    }
  });

  it('margin=0.55 discount=85000 → Kitchen roiDiscount > 1 (break-even ≈ 51.1%)', () => {
    // NOTE: ТЗ specified margin=0.50 expecting roi>1, but arithmetic shows
    // (166299 × 0.50) / 85000 = 0.978 < 1. Break-even = 85000/166299 = 51.1%.
    // Test uses margin=0.55 which gives (166299×0.55)/85000 = 1.076 > 1. ← correct
    const result = computeScenarioB(
      { ...BASE_INPUTS, marginPct: 0.55, discountPerProject: 85000 },
      MOCK_BASELINE
    );
    const kitchenItem = result.items.find((i) => i.category === 'kitchen')!;
    expect(kitchenItem.roiDiscount).toBeGreaterThan(1);
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
});
