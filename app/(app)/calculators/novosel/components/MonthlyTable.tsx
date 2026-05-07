'use client';

import type { CategoryMonthData } from '@/lib/calculators/novosel/types_v2';
import { cn } from '@/lib/utils';

interface Props {
  months: CategoryMonthData[];
  onChange: (months: CategoryMonthData[]) => void;
}

function NumInput({
  value, onChange, step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <input
      type="number"
      min={0}
      step={step}
      value={value}
      onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
      className="h-7 w-full min-w-[64px] rounded border border-lp-border bg-white px-1 text-right text-xs text-lp-dark outline-none focus:border-lp-dark tabular-nums"
    />
  );
}

export function MonthlyTable({ months, onChange }: Props) {
  function update(
    monthIdx: number,
    segment: 'novosel' | 'nonNovosel',
    field: 'created' | 'convPct' | 'aov',
    value: number,
  ) {
    const next = months.map((m, i) => {
      if (i !== monthIdx) return m;
      return { ...m, [segment]: { ...m[segment], [field]: value } };
    });
    onChange(next);
  }

  const COL_HEADERS = ['Создано', 'Конв%', 'АОВ ₽', 'Создано', 'Конв%', 'АОВ ₽'];

  return (
    <div className="overflow-x-auto rounded-lg border border-lp-border">
      <table className="min-w-full text-xs">
        <thead className="bg-lp-muted">
          <tr>
            <th className="sticky left-0 z-10 bg-lp-muted px-3 py-2 text-left font-semibold text-lp-text-muted whitespace-nowrap">
              Месяц
            </th>
            <th colSpan={3} className="border-l border-lp-border px-3 py-2 text-center font-semibold text-lp-dark">
              Новосел
            </th>
            <th colSpan={3} className="border-l border-lp-border px-3 py-2 text-center font-semibold text-lp-text-muted">
              Не Новосел
            </th>
          </tr>
          <tr className="border-t border-lp-border">
            <th className="sticky left-0 z-10 bg-lp-muted px-3 py-1.5" />
            {COL_HEADERS.map((h, i) => (
              <th
                key={i}
                className={cn(
                  'px-2 py-1.5 text-right font-medium text-lp-text-muted',
                  i === 0 || i === 3 ? 'border-l border-lp-border' : ''
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {months.map((m, idx) => (
            <tr
              key={m.month}
              className={cn(
                'border-t border-lp-border',
                m.isForecast
                  ? 'bg-[rgba(253,195,0,0.04)]'
                  : 'bg-[rgba(47,55,56,0.03)]'
              )}
            >
              <td className="sticky left-0 z-10 whitespace-nowrap px-3 py-1.5 font-medium"
                style={{ background: m.isForecast ? 'rgba(253,195,0,0.04)' : 'rgba(47,55,56,0.03)' }}
              >
                {m.month}
                <span className={cn(
                  'ml-1.5 rounded px-1 py-0.5 text-[10px] font-semibold',
                  m.isForecast
                    ? 'bg-lp-yellow/20 text-lp-dark'
                    : 'bg-lp-dark/10 text-lp-dark'
                )}>
                  {m.isForecast ? 'ПРОГНОЗ' : 'ФАКТ'}
                </span>
              </td>

              {/* Novosel */}
              <td className="border-l border-lp-border px-1.5 py-1">
                <NumInput value={m.novosel.created} onChange={(v) => update(idx, 'novosel', 'created', v)} />
              </td>
              <td className="px-1.5 py-1">
                <NumInput value={m.novosel.convPct} step={0.1} onChange={(v) => update(idx, 'novosel', 'convPct', v)} />
              </td>
              <td className="px-1.5 py-1">
                <NumInput value={m.novosel.aov} step={1000} onChange={(v) => update(idx, 'novosel', 'aov', v)} />
              </td>

              {/* Non-novosel */}
              <td className="border-l border-lp-border px-1.5 py-1">
                <NumInput value={m.nonNovosel.created} onChange={(v) => update(idx, 'nonNovosel', 'created', v)} />
              </td>
              <td className="px-1.5 py-1">
                <NumInput value={m.nonNovosel.convPct} step={0.1} onChange={(v) => update(idx, 'nonNovosel', 'convPct', v)} />
              </td>
              <td className="px-1.5 py-1">
                <NumInput value={m.nonNovosel.aov} step={1000} onChange={(v) => update(idx, 'nonNovosel', 'aov', v)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
