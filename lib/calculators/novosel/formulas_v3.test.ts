import { describe, it, expect } from 'vitest';
import {
  calcNovoselCreated,
  discountPerDeal,
  computeCategory,
  computePlannerV3,
} from './formulas_v3';
import type { CategoryInputV3, CategoryConfigV3, ForecastBase } from './types_v3';

const BASE_CONFIG: CategoryConfigV3 = {
  id: 'kitchen',
  name: 'Кухня',
  marginPct: 20,
  discount: { mode: 'pct_cap', pct: 10, cap: 40_000, amount: 0 },
  targetNovoselSharePct: 15,
};

const BASE_FORECAST: ForecastBase = {
  totalCreated: 35_736,
  novoselConvPct: 44.1,     // 0.441 × 100
  novoselAov: 166_299,
  nonNovoselConvPct: 18.2,  // 0.182 × 100
  nonNovoselAov: 113_174,
};

// ── T1: calcNovoselCreated ────────────────────────────────────────────────────

describe('calcNovoselCreated', () => {
  it('T1a: round(1000 × 15/100) = 150', () => {
    expect(calcNovoselCreated(1_000, 15)).toBe(150);
  });

  it('T1b: rounds to nearest integer — round(100 × 11.5/100) = round(11.5) = 12', () => {
    expect(calcNovoselCreated(100, 11.5)).toBe(12);
  });

  it('T1c: 0 totalCreated → 0', () => {
    expect(calcNovoselCreated(0, 50)).toBe(0);
  });
});

// ── T2 / T3: discountPerDeal ──────────────────────────────────────────────────

describe('discountPerDeal', () => {
  it('T2: pct_cap: 10% of 166 299 ₽ → 16 630 (below cap 40 000)', () => {
    const cfg = { mode: 'pct_cap' as const, pct: 10, cap: 40_000, amount: 0 };
    expect(discountPerDeal(cfg, 166_299)).toBe(16_629.9); // 10% of 166 299
  });

  it('T3: pct_cap: 10% of 500 000 ₽ → cap 40 000', () => {
    const cfg = { mode: 'pct_cap' as const, pct: 10, cap: 40_000, amount: 0 };
    expect(discountPerDeal(cfg, 500_000)).toBe(40_000);
  });

  it('fixed: returns amount regardless of AOV', () => {
    const cfg = { mode: 'fixed' as const, pct: 0, cap: 0, amount: 15_000 };
    expect(discountPerDeal(cfg, 500_000)).toBe(15_000);
    expect(discountPerDeal(cfg, 0)).toBe(15_000);
  });
});

// ── T4: computeCategory historical month ─────────────────────────────────────

describe('computeCategory — historical month', () => {
  it('T4: Kitchen Dec-2025: totalCreated=1000, share=15% → novoselCreated=150', () => {
    const input: CategoryInputV3 = {
      config: BASE_CONFIG,
      historical: [
        {
          month: '2026-04',
          totalCreated: 1_000,
          novoselSharePct: 15,
          novoselConvPct: 60,
          novoselAov: 200_000,
          nonNovoselConvPct: 30,
          nonNovoselAov: 150_000,
        },
      ],
      forecastBase: BASE_FORECAST,
    };
    const result = computeCategory(input);
    const apr = result.months.find((m) => m.month === '2026-04')!;
    // novoselCreated = round(1000 × 15/100) = 150
    expect(apr.novoselCreated).toBe(150);
    expect(apr.nonNovoselCreated).toBe(850);
    // novoselPaid = round(150 × 60/100) = 90
    expect(apr.novoselPaid).toBe(90);
    // novoselRevenue = 90 × 200_000 = 18_000_000
    expect(apr.novoselRevenue).toBe(18_000_000);
    // gmv = 90×200k + 255×150k = 18M + 38.25M = 56.25M
    // nonNovoselPaid = round(850 × 30/100) = 255
    expect(apr.nonNovoselPaid).toBe(255);
    expect(apr.gmv).toBe(18_000_000 + 255 * 150_000);
    // margin = gmv × 20%
    expect(apr.margin).toBeCloseTo(apr.gmv * 0.2);
    // discountPerDeal = min(200k × 10%, 40k) = 20k
    expect(apr.discountPerDeal).toBe(20_000);
    // discountCost = 90 × 20k = 1_800_000
    expect(apr.discountCost).toBe(1_800_000);
  });
});

// ── T5: computeCategory forecast uses forecastBase + targetNovoselSharePct ───

describe('computeCategory — forecast month', () => {
  it('T5: forecast month uses forecastBase.totalCreated and targetNovoselSharePct=15', () => {
    const input: CategoryInputV3 = {
      config: { ...BASE_CONFIG, targetNovoselSharePct: 15 },
      historical: [],
      forecastBase: {
        totalCreated: 10_000,
        novoselConvPct: 50,
        novoselAov: 100_000,
        nonNovoselConvPct: 25,
        nonNovoselAov: 80_000,
      },
    };
    const result = computeCategory(input);
    // All forecast months (May–Dec 2026) should use forecastBase
    const may = result.months.find((m) => m.month === '2026-05')!;
    expect(may.isForecast).toBe(true);
    expect(may.totalCreated).toBe(10_000);
    // novoselCreated = round(10_000 × 15/100) = 1_500
    expect(may.novoselCreated).toBe(1_500);
    expect(may.nonNovoselCreated).toBe(8_500);
    // novoselPaid = round(1_500 × 50/100) = 750
    expect(may.novoselPaid).toBe(750);
  });
});

// ── T6: computePlannerV3 grand total ─────────────────────────────────────────

describe('computePlannerV3', () => {
  it('T6: grandTotal sums correctly across 2 identical categories × 13 months', () => {
    const singleInput: CategoryInputV3 = {
      config: {
        id: 'cat1',
        name: 'Cat1',
        marginPct: 20,
        discount: { mode: 'fixed', pct: 0, cap: 0, amount: 10_000 },
        targetNovoselSharePct: 10,
      },
      historical: [],
      forecastBase: {
        totalCreated: 1_000,
        novoselConvPct: 100,
        novoselAov: 100_000,
        nonNovoselConvPct: 100,
        nonNovoselAov: 50_000,
      },
    };
    // With 2 identical categories: grandTotal should be exactly 2× single
    const single = computePlannerV3([singleInput]);
    const doubled = computePlannerV3([
      singleInput,
      { ...singleInput, config: { ...singleInput.config, id: 'cat2', name: 'Cat2' } },
    ]);
    expect(doubled.grandTotal.gmv).toBeCloseTo(single.grandTotal.gmv * 2);
    expect(doubled.grandTotal.netMargin).toBeCloseTo(single.grandTotal.netMargin * 2);
  });
});
