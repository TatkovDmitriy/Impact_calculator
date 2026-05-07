import type { Category, Incrementality } from '../types';

export type { Category, Incrementality };

export type NovoselScenario = 'share-growth' | 'category-compare' | 'segment-benchmark';

export interface NovoselInputs {
  scenario: NovoselScenario;
  category: Category | 'all';
  marginPct: number;            // 0..1, e.g. 0.20
  discountPerProject: number;   // RUB, e.g. 85000
  horizonMonths: number;        // 1..36
  targetNovoselShare: number;   // 0..1, target share
  dealGrowthPct: number;        // monthly deal flow growth 0..1
  incrementality: Incrementality;
}

export interface CategoryMetrics {
  totalCreated: number;
  novoselCreated: number;
  novoselAov: number;
  nonNovoselAov: number;
  novoselConversion: number;    // 0..1
  nonNovoselConversion: number; // 0..1
}

export interface NovoselBaseline {
  byCategory: Record<Category, CategoryMetrics>;
  novoselProjectsPerClient: number;    // 1.25
  nonNovoselProjectsPerClient: number; // 1.10
  novoselPaidPerClient: number;        // 0.75
  nonNovoselPaidPerClient: number;     // 0.48
  trend: Array<{
    month: string; // '2025-12', '2026-01', ...
    byCategory: Record<Category, CategoryMetrics>;
  }>;
}

export interface ScenarioAResult {
  baselineRevenue: number;
  scenarioRevenue: number;
  deltaRevenue: number;
  baselineGrossMargin: number;
  scenarioGrossMargin: number;
  discountCost: number;
  baselineNetMargin: number;
  scenarioNetMargin: number;
  deltaNetMargin: number;
  roiDiscount: number;          // scenarioGrossMargin / discountCost; >1 = profitable
  novoselPaidCount: number;
  warning?: 'discount_exceeds_aov' | 'roi_negative';
}

export interface CategoryCompareItem {
  category: Category;
  novoselRevenue: number;
  grossMargin: number;
  discountCost: number;
  netMargin: number;
  netMarginPerDeal: number;
  roiDiscount: number;
}

export interface ScenarioBResult {
  items: CategoryCompareItem[];
  bestByNetMargin: Category;
  bestByRoi: Category;
}

export interface SegmentPremium {
  category: Category;
  aovPremiumPct: number;            // novoselAov / nonNovoselAov - 1
  convLiftPp: number;               // (novoselConv - nonNovoselConv) * 100
  revenuePerDealPremiumPct: number; // rev/deal novosel / rev/deal non - 1
  revenuePerDealNovosel: number;
  revenuePerDealNonNovosel: number;
}

export interface ScenarioCResult {
  premiums: SegmentPremium[];
  clientMetrics: {
    projectsPerClientLift: number;   // novosel/nonNovosel - 1
    paidPerClientLift: number;
    novoselProjectsPerClient: number;
    nonNovoselProjectsPerClient: number;
  };
  trend: Array<{
    month: string;
    byCategory: Record<Category, {
      novoselAov: number;
      nonNovoselAov: number;
      novoselConversion: number;
      nonNovoselConversion: number;
      novoselShare: number; // novoselCreated / totalCreated
    }>;
  }>;
}

export type NovoselResult = ScenarioAResult | ScenarioBResult | ScenarioCResult;
