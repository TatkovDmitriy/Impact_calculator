import type { TablePayload, TableColumn } from '@/lib/research/types';
import { cn } from '@/lib/utils';

interface Props {
  payload: TablePayload;
}

function formatCell(value: string | number, type: TableColumn['type']): string {
  if (typeof value === 'string') return value;
  switch (type) {
    case 'currency': {
      if (Math.abs(value) >= 1_000_000_000)
        return (value / 1_000_000_000).toFixed(1) + ' млрд ₽';
      if (Math.abs(value) >= 1_000_000)
        return (value / 1_000_000).toFixed(1) + ' млн ₽';
      return value.toLocaleString('ru-RU') + ' ₽';
    }
    case 'percent':
      return value.toFixed(1) + '%';
    case 'number':
      return value.toLocaleString('ru-RU');
    default:
      return String(value);
  }
}

function isNumeric(type: TableColumn['type']): boolean {
  return type === 'number' || type === 'currency' || type === 'percent';
}

export function TableRenderer({ payload }: Props) {
  const { columns, rows, totalRow } = payload;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b border-lp-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-3 py-2 font-semibold text-lp-dark',
                  isNumeric(col.type) ? 'text-right' : 'text-left'
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-lp-border last:border-0 hover:bg-lp-muted/30">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'px-3 py-2 text-lp-dark',
                    isNumeric(col.type) ? 'text-right tabular-nums' : 'text-left'
                  )}
                >
                  {formatCell(row[col.key] ?? '', col.type)}
                </td>
              ))}
            </tr>
          ))}
          {totalRow && (
            <tr className="bg-lp-muted/50">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'px-3 py-2 font-bold text-lp-dark',
                    isNumeric(col.type) ? 'text-right tabular-nums' : 'text-left'
                  )}
                >
                  {formatCell(totalRow[col.key] ?? '', col.type)}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
