import type { KpiPayload } from '@/lib/research/types';
import { cn } from '@/lib/utils';

interface Props {
  payload: KpiPayload;
}

function formatValue(value: number, unit: string): string {
  if (unit === '₽') {
    if (Math.abs(value) >= 1_000_000_000)
      return (value / 1_000_000_000).toFixed(1) + ' млрд';
    if (Math.abs(value) >= 1_000_000)
      return (value / 1_000_000).toFixed(1) + ' млн';
    if (Math.abs(value) >= 1_000)
      return (value / 1_000).toFixed(0) + ' тыс';
  }
  if (unit === '%') return value.toFixed(1);
  if (Number.isInteger(value)) return value.toLocaleString('ru-RU');
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}

export function KpiRenderer({ payload }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {payload.items.map((item, i) => {
        const hasDelta = item.delta !== undefined;
        const positive = hasDelta && (item.delta ?? 0) > 0;
        const negative = hasDelta && (item.delta ?? 0) < 0;
        return (
          <div
            key={i}
            className="flex flex-col gap-1 rounded-lg border border-lp-border bg-white p-3"
          >
            <span className="text-xs font-medium text-lp-text-muted">{item.label}</span>
            <span className="text-xl font-bold text-lp-dark">
              {formatValue(item.value, item.unit)}
              <span className="ml-1 text-sm font-normal text-lp-text-muted">{item.unit}</span>
            </span>
            {hasDelta && (
              <span
                className={cn(
                  'text-xs font-medium',
                  positive && 'text-lp-dark',
                  negative && 'text-red-500',
                  !positive && !negative && 'text-lp-text-muted'
                )}
              >
                {positive ? '+' : ''}
                {formatValue(item.delta!, item.deltaUnit ?? item.unit)}
                {item.deltaUnit ?? item.unit}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
