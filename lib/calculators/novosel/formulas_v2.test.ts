import { describe, it, expect } from 'vitest';
import { discountPerProject, computeCategoryMonth, computeScenario } from './formulas_v2';
import type { CategoryConfig, CategoryMonthData, CategoryInput } from './types_v2';

const BASE_CONFIG: CategoryConfig = {
  id: 'kitchen',
  name: 'Кухня',
  marginPct: 20,
  discount: { mode: 'pct_cap', pct: 10, cap: 40_000, amount: 0 },
};

const BASE_MONTH: CategoryMonthData = {
  month: '2026-04',
  isForecast: false,
  novosel: { created: 100, convPct: 60, aov: 200_000 },
  nonNovosel: { created: 500, convPct: 30, aov: 150_000 },
};

// ── discountPerProject ────────────────────────────────────────────────────────

describe('discountPerProject', () => {
  it('pct_cap: 10% of AOV 200k → 20k (below cap 40k)', () => {
    const cfg = { mode: 'pct_cap' as const, pct: 10, cap: 40_000, amount: 0 };
    expect(discountPerProject(cfg, 200_000)).toBe(20_000);
  });

  it('pct_cap: 10% of AOV 500k → cap 40k (exceeds cap)', () => {
    const cfg = { mode: 'pct_cap' as const, pct: 10, cap: 40_000, amount: 0 };
    expect(discountPerProject(cfg, 500_000)).toBe(40_000);
  });

  it('fixed: returns amount regardless of AOV', () => {
    const cfg = { mode: 'fixed' as const, pct: 10, cap: 40_000, amount: 15_000 };
    expect(discountPerProject(cfg, 200_000)).toBe(15_000);
    expect(discountPerProject(cfg, 0)).toBe(15_000);
  });
});

// ── computeCategoryMonth ──────────────────────────────────────────────────────

describe('computeCategoryMonth', () => {
  it('Kitchen, marginPct=20, pct_cap pct=10 cap=40k — control case from spec', () => {
    // paid_N = round(100 × 60/100) = 60
    // paid_NN = round(500 × 30/100) = 150
    // gmv = 60×200_000 + 150×150_000 = 12_000_000 + 22_500_000 = 34_500_000
    // margin = 34_500_000 × 0.20 = 6_900_000
    // dpj = min(200_000×0.10, 40_000) = 20_000
    // discountCost = 60 × 20_000 = 1_200_000
    // netMargin = 6_900_000 − 1_200_000 = 5_700_000
    const result = computeCategoryMonth(BASE_CONFIG, BASE_MONTH);
    expect(result.novosel.paid).toBe(60);
    expect(result.nonNovosel.paid).toBe(150);
    expect(result.gmv).toBe(34_500_000);
    expect(result.margin).toBe(6_900_000);
    expect(result.discountPerProject).toBe(20_000);
    expect(result.discountCost).toBe(1_200_000);
    expect(result.netMargin).toBe(5_700_000);
  });

  it('Cap hit: AOV=500k, pct=10, cap=40k → dpj=40k, discountCost=400k', () => {
    const config: CategoryConfig = {
      ...BASE_CONFIG,
      discount: { mode: 'pct_cap', pct: 10, cap: 40_000, amount: 0 },
    };
    const month: CategoryMonthData = {
      ...BASE_MONTH,
      novosel: { created: 10, convPct: 100, aov: 500_000 },
    };
    const result = computeCategoryMonth(config, month);
    expect(result.discountPerProject).toBe(40_000);
    expect(result.novosel.paid).toBe(10);
    expect(result.discountCost).toBe(400_000);
  });

  it('Fixed discount: amount=15k, paid_N=40 → discountCost=600k', () => {
    const config: CategoryConfig = {
      ...BASE_CONFIG,
      discount: { mode: 'fixed', pct: 0, cap: 0, amount: 15_000 },
    };
    const month: CategoryMonthData = {
      ...BASE_MONTH,
      novosel: { created: 50, convPct: 80, aov: 200_000 },
    };
    const result = computeCategoryMonth(config, month);
    expect(result.novosel.paid).toBe(40);
    expect(result.discountCost).toBe(600_000);
  });

  it('Edge case: created=0 → gmv=0, discountCost=0, no division errors', () => {
    const month: CategoryMonthData = {
      ...BASE_MONTH,
      novosel: { created: 0, convPct: 60, aov: 200_000 },
      nonNovosel: { created: 0, convPct: 30, aov: 150_000 },
    };
    const result = computeCategoryMonth(BASE_CONFIG, month);
    expect(result.novosel.paid).toBe(0);
    expect(result.gmv).toBe(0);
    expect(result.discountCost).toBe(0);
    expect(result.netMargin).toBe(0);
  });
});

// ── computeScenario ───────────────────────────────────────────────────────────

describe('computeScenario', () => {
  it('grandTotal sums correctly across categories and months', () => {
    const input: CategoryInput = {
      config: BASE_CONFIG,
      months: [BASE_MONTH, { ...BASE_MONTH, month: '2026-05', isForecast: true }],
    };
    const result = computeScenario([input]);
    // Each month: gmv=34_500_000 → total=69_000_000
    expect(result.grandTotal.gmv).toBe(69_000_000);
    expect(result.grandTotal.netMargin).toBe(11_400_000);
  });
});
