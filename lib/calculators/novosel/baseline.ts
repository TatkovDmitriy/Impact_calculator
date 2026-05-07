import type { NovoselBaseline } from './types';

export const NOVOSEL_BASELINE: NovoselBaseline = {
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
        bathroom: { totalCreated: 22013, novoselCreated: 2382, novoselAov: 155605, nonNovoselAov: 107917, novoselConversion: 0.864, nonNovoselConversion: 0.641 },
        kitchen:  { totalCreated: 32092, novoselCreated: 2438, novoselAov: 211919, nonNovoselAov: 154433, novoselConversion: 0.649, nonNovoselConversion: 0.337 },
        storage:  { totalCreated: 19126, novoselCreated: 1408, novoselAov: 84880,  nonNovoselAov: 59556,  novoselConversion: 0.594, nonNovoselConversion: 0.429 },
      },
    },
    {
      month: '2026-01',
      byCategory: {
        bathroom: { totalCreated: 23689, novoselCreated: 2730, novoselAov: 154365, nonNovoselAov: 106195, novoselConversion: 0.851, nonNovoselConversion: 0.575 },
        kitchen:  { totalCreated: 34929, novoselCreated: 2680, novoselAov: 207885, nonNovoselAov: 149054, novoselConversion: 0.601, nonNovoselConversion: 0.267 },
        storage:  { totalCreated: 21232, novoselCreated: 1605, novoselAov: 88720,  nonNovoselAov: 58268,  novoselConversion: 0.547, nonNovoselConversion: 0.409 },
      },
    },
    {
      month: '2026-02',
      byCategory: {
        bathroom: { totalCreated: 23385, novoselCreated: 3016, novoselAov: 146051, nonNovoselAov: 103957, novoselConversion: 0.856, nonNovoselConversion: 0.566 },
        kitchen:  { totalCreated: 32689, novoselCreated: 2938, novoselAov: 201776, nonNovoselAov: 140848, novoselConversion: 0.571, nonNovoselConversion: 0.244 },
        storage:  { totalCreated: 19315, novoselCreated: 1731, novoselAov: 84675,  nonNovoselAov: 55560,  novoselConversion: 0.523, nonNovoselConversion: 0.355 },
      },
    },
    {
      month: '2026-03',
      byCategory: {
        bathroom: { totalCreated: 27974, novoselCreated: 5116, novoselAov: 128586, nonNovoselAov: 98060, novoselConversion: 0.844, nonNovoselConversion: 0.519 },
        kitchen:  { totalCreated: 38301, novoselCreated: 4255, novoselAov: 191899, nonNovoselAov: 131939, novoselConversion: 0.544, nonNovoselConversion: 0.233 },
        storage:  { totalCreated: 23244, novoselCreated: 2662, novoselAov: 82369,  nonNovoselAov: 52124,  novoselConversion: 0.533, nonNovoselConversion: 0.336 },
      },
    },
    {
      month: '2026-04',
      byCategory: {
        bathroom: { totalCreated: 27429, novoselCreated: 5331, novoselAov: 119374, nonNovoselAov: 92096, novoselConversion: 0.745, nonNovoselConversion: 0.437 },
        kitchen:  { totalCreated: 35736, novoselCreated: 4179, novoselAov: 166299, nonNovoselAov: 113174, novoselConversion: 0.441, nonNovoselConversion: 0.182 },
        storage:  { totalCreated: 20685, novoselCreated: 2828, novoselAov: 74180,  nonNovoselAov: 44538,  novoselConversion: 0.428, nonNovoselConversion: 0.285 },
      },
    },
  ],
};
