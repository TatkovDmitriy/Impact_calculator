'use client';

import { AnimatedNumber } from '../AnimatedNumber';
import type { ScenarioV3Result } from '@/lib/calculators/novosel/types_v3';

function fmtM(n: number) {
  return (Math.abs(n) / 1_000_000).toFixed(1).replace('.', ',') + ' млн ₽';
}

interface Props {
  result: ScenarioV3Result;
}

const CARDS = [
  { key: 'gmv' as const, label: 'GMV total' },
  { key: 'margin' as const, label: 'Маржа total' },
  { key: 'discountCost' as const, label: 'Затраты на дисконт' },
  { key: 'netMargin' as const, label: 'Чистая маржа' },
];

export function PlannerKPIsV3({ result }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {CARDS.map(({ key, label }) => {
        const value = result.grandTotal[key];
        const isNegative = value < 0;
        return (
          <div key={key} className="rounded-xl border border-lp-border bg-white p-4 shadow-sm">
            <div className="mb-1 text-xs text-lp-text-muted">{label}</div>
            <div
              className="text-xl font-bold tabular-nums"
              style={{ color: isNegative ? '#B84A4A' : '#2F3738' }}
            >
              <AnimatedNumber value={value} format={fmtM} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
