'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { DiscountConfigForm } from './DiscountConfigForm';
import { MonthlyTable } from './MonthlyTable';
import type { CategoryInput, CategoryConfig } from '@/lib/calculators/novosel/types_v2';
import type { CategoryResult } from '@/lib/calculators/novosel/types_v2';
import { cn } from '@/lib/utils';

function fmtM(n: number) {
  return (Math.abs(n) / 1_000_000).toFixed(1).replace('.', ',') + ' млн ₽';
}

interface Props {
  item: CategoryInput;
  result: CategoryResult | undefined;
  color: string;
  onUpdate: (updated: CategoryInput) => void;
  onDelete: () => void;
  canDelete: boolean;
}

export function CategoryAccordion({ item, result, color, onUpdate, onDelete, canDelete }: Props) {
  const [open, setOpen] = useState(false);

  function updateConfig(patch: Partial<CategoryConfig>) {
    onUpdate({ ...item, config: { ...item.config, ...patch } });
  }

  return (
    <div className="rounded-xl border border-lp-border bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-lp-muted/50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="flex-1 text-sm font-semibold text-lp-dark">{item.config.name}</span>

        {result && (
          <span className="rounded-full bg-lp-muted px-2 py-0.5 text-xs text-lp-text-muted tabular-nums">
            {fmtM(result.totals.gmv)} GMV
          </span>
        )}

        {canDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Удалить категорию «${item.config.name}»?`)) onDelete();
            }}
            className="rounded-md p-1 text-lp-text-muted hover:bg-lp-danger/10 hover:text-lp-danger transition-colors"
          >
            <Trash2 size={14} />
          </button>
        )}

        {open ? <ChevronDown size={14} className="text-lp-text-muted shrink-0" /> : <ChevronRight size={14} className="text-lp-text-muted shrink-0" />}
      </div>

      {/* Body */}
      {open && (
        <div className="border-t border-lp-border px-4 py-4 flex flex-col gap-4">
          {/* Config row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-lp-text-muted">
                Название категории
              </label>
              <input
                value={item.config.name}
                onChange={(e) => updateConfig({ name: e.target.value })}
                className="h-9 w-full rounded-lg border border-lp-border px-3 text-sm text-lp-dark outline-none focus:border-lp-dark"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-lp-text-muted">
                Маржа проекта (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={item.config.marginPct}
                onChange={(e) => updateConfig({ marginPct: Math.min(100, Math.max(0, Number(e.target.value))) })}
                className="h-9 w-full rounded-lg border border-lp-border px-3 text-sm text-lp-dark outline-none focus:border-lp-dark"
              />
            </div>

            <div className={cn('sm:col-span-1')}>
              <div className="mb-1.5 text-xs font-medium text-lp-text-muted">Конфигурация дисконта</div>
              <DiscountConfigForm
                value={item.config.discount}
                onChange={(d) => updateConfig({ discount: d })}
              />
            </div>
          </div>

          {/* Monthly table */}
          <div>
            <div className="mb-2 text-xs font-medium text-lp-text-muted">Данные по месяцам</div>
            <MonthlyTable
              months={item.months}
              onChange={(months) => onUpdate({ ...item, months })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
