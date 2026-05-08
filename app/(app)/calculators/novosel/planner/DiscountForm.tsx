'use client';

import type { DiscountConfig } from '@/lib/calculators/novosel/types_v3';
import { cn } from '@/lib/utils';

interface Props {
  value: DiscountConfig;
  onChange: (d: DiscountConfig) => void;
}

export function DiscountForm({ value, onChange }: Props) {
  const set = (patch: Partial<DiscountConfig>) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1">
        {(['pct_cap', 'fixed'] as const).map((m) => (
          <button
            key={m}
            onClick={() => set({ mode: m })}
            className={cn(
              'flex-1 rounded-md border py-1 text-xs font-medium transition-colors',
              value.mode === m
                ? 'border-lp-dark bg-lp-dark text-white'
                : 'border-lp-border text-lp-text-muted hover:border-lp-dark hover:text-lp-dark',
            )}
          >
            {m === 'pct_cap' ? '% с капом' : 'Фиксированная'}
          </button>
        ))}
      </div>

      {value.mode === 'pct_cap' ? (
        <div className="flex gap-2">
          <label className="flex flex-1 flex-col gap-0.5">
            <span className="text-xs text-lp-text-muted">%</span>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={value.pct}
              onChange={(e) => set({ pct: Math.min(100, Math.max(0, Number(e.target.value))) })}
              className="h-8 w-full rounded-lg border border-lp-border px-2 text-xs text-lp-dark outline-none focus:border-lp-dark"
            />
          </label>
          <label className="flex flex-1 flex-col gap-0.5">
            <span className="text-xs text-lp-text-muted">Кап ₽</span>
            <input
              type="number"
              min={0}
              step={1_000}
              value={value.cap}
              onChange={(e) => set({ cap: Math.max(0, Number(e.target.value)) })}
              className="h-8 w-full rounded-lg border border-lp-border px-2 text-xs text-lp-dark outline-none focus:border-lp-dark"
            />
          </label>
        </div>
      ) : (
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-lp-text-muted">Сумма ₽</span>
          <input
            type="number"
            min={0}
            step={1_000}
            value={value.amount}
            onChange={(e) => set({ amount: Math.max(0, Number(e.target.value)) })}
            className="h-8 w-full rounded-lg border border-lp-border px-2 text-xs text-lp-dark outline-none focus:border-lp-dark"
          />
        </label>
      )}
    </div>
  );
}
