'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import * as Slider from '@radix-ui/react-slider';
import { DiscountForm } from './DiscountForm';
import { HistoricalDataTable } from './HistoricalDataTable';
import { ForecastChart } from './ForecastChart';
import type { CategoryInputV3, CategoryResultV3 } from '@/lib/calculators/novosel/types_v3';
import { cn } from '@/lib/utils';

function fmtM(n: number) {
  return (Math.abs(n) / 1_000_000).toFixed(1).replace('.', ',') + ' млн ₽';
}

interface Props {
  item: CategoryInputV3;
  result: CategoryResultV3 | undefined;
  color: string;
  onUpdate: (updated: CategoryInputV3) => void;
}

export function CategoryCard({ item, result, color, onUpdate }: Props) {
  const [open, setOpen] = useState(false);

  function patchConfig(patch: Partial<CategoryInputV3['config']>) {
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

        {open ? (
          <ChevronDown size={14} className="text-lp-text-muted shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-lp-text-muted shrink-0" />
        )}
      </div>

      {/* Body */}
      {open && (
        <div className="border-t border-lp-border px-4 py-4 flex flex-col gap-5">
          {/* Config row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Margin */}
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
                onChange={(e) =>
                  patchConfig({ marginPct: Math.min(100, Math.max(0, Number(e.target.value))) })
                }
                className="h-9 w-full rounded-lg border border-lp-border px-3 text-sm text-lp-dark outline-none focus:border-lp-dark"
              />
            </div>

            {/* Discount */}
            <div>
              <div className="mb-1.5 text-xs font-medium text-lp-text-muted">
                Конфигурация дисконта
              </div>
              <DiscountForm
                value={item.config.discount}
                onChange={(d) => patchConfig({ discount: d })}
              />
            </div>

            {/* Target share slider — full width */}
            <div className="sm:col-span-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-lp-text-muted">
                  Целевая доля Новоселов (прогноз)
                </span>
                <span className="text-xs font-semibold text-lp-dark tabular-nums">
                  {item.config.targetNovoselSharePct}%
                </span>
              </div>
              <Slider.Root
                value={[item.config.targetNovoselSharePct]}
                min={1}
                max={50}
                step={1}
                onValueChange={([v]) => patchConfig({ targetNovoselSharePct: v })}
                className="relative flex h-5 w-full items-center"
              >
                <Slider.Track className="relative h-1.5 w-full grow rounded-full bg-lp-border">
                  <Slider.Range className="absolute h-full rounded-full bg-lp-yellow" />
                </Slider.Track>
                <Slider.Thumb className="block h-4 w-4 rounded-full border-2 border-lp-yellow bg-white shadow focus:outline-none" />
              </Slider.Root>
              <div className="mt-1 text-[10px] text-lp-text-muted">
                Применяется к маю–декабрю 2026. Базовые объёмы — апрель 2026.
              </div>
            </div>
          </div>

          {/* Historical table */}
          <div>
            <div className="mb-2 text-xs font-medium text-lp-text-muted">
              Фактические данные (дек 2025 – апр 2026)
            </div>
            <HistoricalDataTable
              rows={item.historical}
              onChange={(historical) => onUpdate({ ...item, historical })}
            />
          </div>

          {/* Forecast chart */}
          {result && (
            <ForecastChart result={result} categoryName={item.config.name} />
          )}
        </div>
      )}
    </div>
  );
}
