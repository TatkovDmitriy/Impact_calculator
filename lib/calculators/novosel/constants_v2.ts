import type { DiscountConfig } from './types_v2';

export const HISTORICAL_MONTHS = [
  '2025-12', '2026-01', '2026-02', '2026-03', '2026-04',
] as const;

export const FORECAST_MONTHS = [
  '2026-05', '2026-06', '2026-07', '2026-08',
  '2026-09', '2026-10', '2026-11', '2026-12',
] as const;

export const ALL_MONTHS: string[] = [...HISTORICAL_MONTHS, ...FORECAST_MONTHS];

export const FORECAST_MONTHS_SET = new Set<string>(FORECAST_MONTHS);

export const DEFAULT_DISCOUNT: DiscountConfig = {
  mode: 'pct_cap',
  pct: 10,
  cap: 10_000,
  amount: 10_000,
};

// Category color palette (brand-safe: no green)
export const CATEGORY_COLORS: string[] = [
  '#FDC300', // kitchen
  '#2F3738', // bathroom
  '#B84A4A', // storage
  '#8B8B8B',
  '#5A6166',
  '#C4C4C4',
  '#6B7280',
];

export const BASELINE_CAT_CAPS: Record<string, number> = {
  kitchen: 40_000,
  bathroom: 10_000,
  storage: 10_000,
};
