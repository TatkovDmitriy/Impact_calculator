import type { ResearchPayload } from '@/lib/research/types';
import { KpiRenderer } from './KpiRenderer';
import { TableRenderer } from './TableRenderer';
import { LineChartRenderer } from './LineChartRenderer';
import { BarChartRenderer } from './BarChartRenderer';

interface Props {
  payload: ResearchPayload;
}

export function PayloadRenderer({ payload }: Props) {
  switch (payload.kind) {
    case 'kpi':
      return <KpiRenderer payload={payload} />;
    case 'table':
      return <TableRenderer payload={payload} />;
    case 'line_chart':
      return <LineChartRenderer payload={payload} />;
    case 'bar_chart':
      return <BarChartRenderer payload={payload} />;
    case 'composite':
      return (
        <div className="flex flex-col gap-4">
          {payload.blocks.map((block, i) => (
            <PayloadRenderer key={i} payload={block} />
          ))}
        </div>
      );
    default: {
      const kind = (payload as { kind: string }).kind;
      return (
        <div className="rounded-md border border-dashed border-lp-border px-4 py-3 text-sm text-lp-text-muted">
          Рендерер не реализован: {kind}
        </div>
      );
    }
  }
}
