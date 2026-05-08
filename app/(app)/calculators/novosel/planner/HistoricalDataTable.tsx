'use client';

import type { HistoricalMonthRow } from '@/lib/calculators/novosel/types_v3';
import { HISTORICAL_MONTHS } from '@/lib/calculators/novosel/constants_v3';
import { cn } from '@/lib/utils';

interface Props {
  rows: HistoricalMonthRow[];
  onChange: (rows: HistoricalMonthRow[]) => void;
}

function NumInput({
  value,
  onChange,
  step = 1,
  min = 0,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
}) {
  return (
    <input
      type="number"
      min={min}
      step={step}
      value={value}
      onChange={(e) => onChange(Math.max(min, Number(e.target.value)))}
      className="h-7 w-full min-w-[60px] rounded border border-lp-border bg-white px-1 text-right text-xs text-lp-dark outline-none focus:border-lp-dark tabular-nums"
    />
  );
}

export function HistoricalDataTable({ rows, onChange }: Props) {
  function update(
    month: string,
    field: keyof Omit<HistoricalMonthRow, 'month'>,
    value: number,
  ) {
    onChange(rows.map((r) => (r.month === month ? { ...r, [field]: value } : r)));
  }

  const COL_HEADERS = [
    'Всего создано',
    'Доля НС %',
    'Конв% НС',
    'АОВ НС ₽',
    'Конв% не-НС',
    'АОВ не-НС ₽',
  ];

  return (
    <div className="overflow-x-auto rounded-lg border border-lp-border">
      <table className="min-w-full text-xs">
        <thead className="bg-lp-muted">
          <tr>
            <th className="sticky left-0 z-10 bg-lp-muted px-3 py-2 text-left font-semibold text-lp-text-muted whitespace-nowrap">
              Месяц
            </th>
            {COL_HEADERS.map((h, i) => (
              <th
                key={i}
                className={cn(
                  'px-2 py-2 text-right font-medium text-lp-text-muted whitespace-nowrap',
                  i === 0 ? 'border-l border-lp-border' : '',
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.month}
              className="border-t border-lp-border bg-[rgba(47,55,56,0.03)]"
            >
              <td className="sticky left-0 z-10 whitespace-nowrap px-3 py-1.5 font-medium bg-[rgba(47,55,56,0.03)]">
                {row.month}
                <span className="ml-1.5 rounded bg-lp-dark/10 px-1 py-0.5 text-[10px] font-semibold text-lp-dark">
                  ФАКТ
                </span>
              </td>
              <td className="border-l border-lp-border px-1.5 py-1">
                <NumInput
                  value={row.totalCreated}
                  onChange={(v) => update(row.month, 'totalCreated', v)}
                />
              </td>
              <td className="px-1.5 py-1">
                <NumInput
                  value={row.novoselSharePct}
                  step={0.1}
                  onChange={(v) => update(row.month, 'novoselSharePct', Math.min(100, v))}
                />
              </td>
              <td className="px-1.5 py-1">
                <NumInput
                  value={row.novoselConvPct}
                  step={0.1}
                  onChange={(v) => update(row.month, 'novoselConvPct', Math.min(100, v))}
                />
              </td>
              <td className="px-1.5 py-1">
                <NumInput
                  value={row.novoselAov}
                  step={1_000}
                  onChange={(v) => update(row.month, 'novoselAov', v)}
                />
              </td>
              <td className="px-1.5 py-1">
                <NumInput
                  value={row.nonNovoselConvPct}
                  step={0.1}
                  onChange={(v) => update(row.month, 'nonNovoselConvPct', Math.min(100, v))}
                />
              </td>
              <td className="px-1.5 py-1">
                <NumInput
                  value={row.nonNovoselAov}
                  step={1_000}
                  onChange={(v) => update(row.month, 'nonNovoselAov', v)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function buildEmptyHistoricalRows(): HistoricalMonthRow[] {
  return HISTORICAL_MONTHS.map((month) => ({
    month,
    totalCreated: 0,
    novoselSharePct: 0,
    novoselConvPct: 0,
    novoselAov: 0,
    nonNovoselConvPct: 0,
    nonNovoselAov: 0,
  }));
}
