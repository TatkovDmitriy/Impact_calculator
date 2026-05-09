import { Timestamp } from 'firebase/firestore';

export type ResearchKind = 'kpi' | 'table' | 'line_chart' | 'bar_chart' | 'composite';
export type ResearchCategory = 'metrics' | 'cohorts' | 'segments' | 'funnels' | 'other';

export interface KpiItem {
  label: string;
  value: number;
  unit: string;
  delta?: number;
  deltaUnit?: string;
}

export interface KpiPayload {
  kind: 'kpi';
  items: KpiItem[];
}

export interface TableColumn {
  key: string;
  label: string;
  type: 'string' | 'number' | 'percent' | 'currency';
}

export interface TablePayload {
  kind: 'table';
  columns: TableColumn[];
  rows: Array<Record<string, string | number>>;
  totalRow?: Record<string, string | number>;
}

export interface ChartSeries {
  name: string;
  color?: string;
  data: number[];
}

export interface LineChartPayload {
  kind: 'line_chart';
  xAxis: string[];
  series: ChartSeries[];
  yUnit?: string;
}

export interface BarChartPayload {
  kind: 'bar_chart';
  xAxis: string[];
  series: ChartSeries[];
  yUnit?: string;
  stacked?: boolean;
}

export interface CompositePayload {
  kind: 'composite';
  blocks: Exclude<ResearchPayload, CompositePayload>[];
}

export type ResearchPayload =
  | KpiPayload
  | TablePayload
  | LineChartPayload
  | BarChartPayload
  | CompositePayload;

export interface ResearchMeta {
  sourceQueryHash: string;
  lastRefreshedAt: Timestamp;
  rowCountSource: number;
  publishedBy: string;
  scriptVersion: string;
}

export interface ResearchItem {
  slug: string;
  title: string;
  description: string;
  category: ResearchCategory;
  payload: ResearchPayload;
  meta: ResearchMeta;
}
