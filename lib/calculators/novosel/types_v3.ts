export type DiscountMode = 'pct_cap' | 'fixed';

export interface DiscountConfig {
  mode: DiscountMode;
  pct: number;    // 0–100
  cap: number;    // RUB
  amount: number; // RUB
}

export interface CategoryConfigV3 {
  id: string;
  name: string;
  marginPct: number;             // 0–100
  discount: DiscountConfig;
  targetNovoselSharePct: number; // 0–100, applied to all forecast months
}

// User-entered actuals for a historical month (Dec 2025 – Apr 2026)
export interface HistoricalMonthRow {
  month: string;             // 'YYYY-MM'
  totalCreated: number;
  novoselSharePct: number;   // actual % of novosel among created, 0–100
  novoselConvPct: number;    // 0–100
  novoselAov: number;        // RUB
  nonNovoselConvPct: number; // 0–100
  nonNovoselAov: number;     // RUB
}

// Baseline values used to project all 8 forecast months unchanged
export interface ForecastBase {
  totalCreated: number;
  novoselConvPct: number;    // 0–100
  novoselAov: number;
  nonNovoselConvPct: number; // 0–100
  nonNovoselAov: number;
}

export interface CategoryInputV3 {
  config: CategoryConfigV3;
  historical: HistoricalMonthRow[];  // 5 rows: Dec 2025 – Apr 2026
  forecastBase: ForecastBase;        // Apr 2026 values projected forward
}

// Computed result for a single month
export interface MonthResultV3 {
  month: string;
  isForecast: boolean;
  totalCreated: number;
  novoselCreated: number;
  nonNovoselCreated: number;
  novoselSharePct: number;   // actual (historical) or target (forecast)
  novoselPaid: number;
  nonNovoselPaid: number;
  novoselRevenue: number;
  nonNovoselRevenue: number;
  gmv: number;
  margin: number;
  discountCost: number;
  netMargin: number;
  discountPerDeal: number;
}

export interface CategoryResultV3 {
  categoryId: string;
  categoryName: string;
  months: MonthResultV3[];  // 13 months: Dec 2025 – Dec 2026
  totals: {
    gmv: number;
    margin: number;
    discountCost: number;
    netMargin: number;
  };
}

export interface MonthlyAggregateV3 {
  month: string;
  isForecast: boolean;
  gmv: number;
  margin: number;
  discountCost: number;
  netMargin: number;
}

export interface ScenarioV3Result {
  categories: CategoryResultV3[];
  monthly: MonthlyAggregateV3[];
  grandTotal: {
    gmv: number;
    margin: number;
    discountCost: number;
    netMargin: number;
  };
}
