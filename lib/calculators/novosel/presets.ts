import type { ScenarioPreset } from '../types';
import type { NovoselInputs } from './types';

export const NOVOSEL_PRESETS: ScenarioPreset<NovoselInputs>[] = [
  {
    label: 'Базовый',
    color: '#2F3738',
    inputs: {
      scenario: 'share-growth',
      category: 'all',
      targetNovoselShare: 0.147, // Apr 2026 actual
      marginPct: 0.20,
      discountPerProject: 85000,
      incrementality: 'full',
      horizonMonths: 12,
      dealGrowthPct: 0,
    },
  },
  {
    label: 'Оптимистичный',
    color: '#FDC300',
    inputs: {
      scenario: 'share-growth',
      category: 'all',
      targetNovoselShare: 0.25,
      marginPct: 0.20,
      discountPerProject: 85000,
      incrementality: 'full',
      horizonMonths: 12,
      dealGrowthPct: 0,
    },
  },
  {
    label: 'Консервативный',
    color: '#8B8B8B',
    inputs: {
      scenario: 'share-growth',
      category: 'all',
      targetNovoselShare: 0.147,
      marginPct: 0.20,
      discountPerProject: 85000,
      incrementality: 'half', // only 50% incremental
      horizonMonths: 12,
      dealGrowthPct: 0,
    },
  },
];
