import { z } from 'zod';
import type { CalculatorPlugin } from '../types';
import type { NovoselInputs, NovoselBaseline, NovoselResult } from './types';
import { computeScenarioA, computeScenarioB, computeScenarioC } from './formulas';
import { NOVOSEL_PRESETS } from './presets';

const novoselInputsSchema = z.object({
  scenario: z.enum(['share-growth', 'category-compare', 'segment-benchmark']),
  category: z.enum(['bathroom', 'kitchen', 'storage', 'all']),
  marginPct: z.number().min(0.05).max(0.5),
  horizonMonths: z.number().int().min(1).max(36),
  targetNovoselShare: z.number().min(0.05).max(0.5),
  dealGrowthPct: z.number().min(-0.2).max(0.5),
  incrementality: z.enum(['full', 'half', 'none']),
  serviceSharePct: z.number().min(0).max(1),
});

export const novoselPlugin: CalculatorPlugin<NovoselInputs, NovoselResult, NovoselBaseline> = {
  slug: 'novosel-loyalty-impact',
  title: 'Новосел: программа лояльности',
  description:
    'Оценка бизнес-эффекта программы лояльности для покупателей новостроек. Три сценария: рост доли, сравнение категорий, бенчмарк сегментов.',
  category: 'revenue',
  inputsSchema: novoselInputsSchema,
  requiredMetrics: [
    'novosel.kitchen.aov',
    'novosel.bathroom.aov',
    'novosel.storage.aov',
    'novosel.kitchen.conversion',
    'novosel.bathroom.conversion',
    'novosel.storage.conversion',
    'novosel.kitchen.totalCreated',
    'novosel.bathroom.totalCreated',
    'novosel.storage.totalCreated',
  ],
  compute(inputs: NovoselInputs, baseline: NovoselBaseline): NovoselResult {
    switch (inputs.scenario) {
      case 'share-growth':
        return computeScenarioA(inputs, baseline);
      case 'category-compare':
        return computeScenarioB(inputs, baseline);
      case 'segment-benchmark':
        return computeScenarioC(baseline);
    }
  },
  visualization: [
    { type: 'waterfall', library: 'echarts', description: 'Baseline → Novosel revenue → discount → net margin' },
    { type: 'line-sensitivity', library: 'recharts', description: 'Share 5–50% → net margin sensitivity' },
    { type: 'grouped-bar', library: 'echarts', description: '3 categories × 4 metrics' },
    { type: 'radar', library: 'echarts', description: '5 axes, 3 categories' },
    { type: 'multi-line-trend', library: 'recharts', description: '5 months, Novosel vs Non-Novosel' },
    { type: 'heatmap-table', library: 'tanstack', description: 'Premium % per cell' },
  ],
  compareVisualization: {
    primaryMetric: 'deltaNetMargin',
    deltaMetrics: ['deltaRevenue', 'roiDiscount', 'discountCost'],
    sensitivityAxis: 'targetNovoselShare',
  },
  scenarioDefaults: NOVOSEL_PRESETS,
  version: '1.0.0',
};
