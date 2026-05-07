import type { ZodSchema } from 'zod';

export type Category = 'bathroom' | 'kitchen' | 'storage';
export type Incrementality = 'full' | 'half' | 'none';

export interface ScenarioPreset<I = Record<string, unknown>> {
  label: string;
  color: string;
  inputs: Partial<I>;
}

export interface CompareVizSpec {
  primaryMetric: string;
  deltaMetrics: string[];
  sensitivityAxis: string;
}

export interface VizSpec {
  type: string;
  library: 'recharts' | 'echarts' | 'tanstack' | 'framer';
  description: string;
}

export interface CalculatorPlugin<I, O, B = unknown> {
  slug: string;
  title: string;
  description: string;
  category: 'revenue' | 'cx' | 'ops' | 'risk';
  inputsSchema: ZodSchema<I>;
  requiredMetrics: string[];
  compute: (inputs: I, baseline: B) => O;
  visualization: VizSpec[];
  compareVisualization: CompareVizSpec;
  scenarioDefaults: ScenarioPreset<I>[];
  version: string;
}
