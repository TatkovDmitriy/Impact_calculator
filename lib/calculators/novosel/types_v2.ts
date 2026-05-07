export type DiscountMode = 'pct_cap' | 'fixed';

export interface DiscountConfig {
  mode: DiscountMode;
  pct: number;    // 0–100, used in pct_cap mode
  cap: number;    // RUB, used in pct_cap mode
  amount: number; // RUB, used in fixed mode
}

export interface CategoryConfig {
  id: string;
  name: string;
  marginPct: number;  // 0–100
  discount: DiscountConfig;
}

export interface SegmentMonthInput {
  created: number;  // project count
  convPct: number;  // conversion rate 0–100
  aov: number;      // average order value, RUB
}

export interface CategoryMonthData {
  month: string;      // 'YYYY-MM'
  isForecast: boolean;
  novosel: SegmentMonthInput;
  nonNovosel: SegmentMonthInput;
}

export interface CategoryInput {
  config: CategoryConfig;
  months: CategoryMonthData[]; // 13 months: Dec 2025 – Dec 2026
}

// Results

export interface SegmentMonthResult {
  paid: number;
  revenue: number;
}

export interface CategoryMonthResult {
  month: string;
  isForecast: boolean;
  novosel: SegmentMonthResult;
  nonNovosel: SegmentMonthResult;
  gmv: number;
  margin: number;
  discountCost: number;
  netMargin: number;
  discountPerProject: number;
}

export interface CategoryResult {
  categoryId: string;
  categoryName: string;
  months: CategoryMonthResult[];
  totals: { gmv: number; margin: number; discountCost: number; netMargin: number };
}

export interface MonthlyAggregate {
  month: string;
  isForecast: boolean;
  gmv: number;
  margin: number;
  discountCost: number;
  netMargin: number;
  byCategory: Record<string, number>; // categoryId → gmv
}

export interface ScenarioV2Result {
  categories: CategoryResult[];
  monthly: MonthlyAggregate[];
  grandTotal: { gmv: number; margin: number; discountCost: number; netMargin: number };
}
