'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { AnimatedNumber } from './AnimatedNumber';
import type { ScenarioBResult } from '@/lib/calculators/novosel/types';

const CAT_LABELS: Record<string, string> = {
  kitchen: 'Кухня',
  bathroom: 'Ванная',
  storage: 'Хранение',
};

function fmtM(n: number) {
  return (Math.abs(n) / 1_000_000).toFixed(1).replace('.', ',') + ' млн ₽';
}

interface Props {
  result: ScenarioBResult;
}

export function ScenarioBPanel({ result }: Props) {
  const barData = result.items.map((item) => ({
    category: CAT_LABELS[item.category],
    'Выручка': Math.round(item.novoselRevenue / 1_000_000),
    'Gross Margin': Math.round(item.grossMargin / 1_000_000),
    'Net Margin': Math.round(item.netMargin / 1_000_000),
    'Дисконт': Math.round(item.discountCost / 1_000_000),
  }));

  return (
    <div className="flex flex-col gap-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {result.items.map((item) => (
          <div key={item.category} className="rounded-xl border border-lp-border bg-white p-4 shadow-sm">
            <div className="mb-1 text-xs font-medium text-lp-text-muted">{CAT_LABELS[item.category]}</div>
            <div className="mb-0.5 text-lg font-bold text-lp-dark tabular-nums">
              <AnimatedNumber value={item.roiDiscount} format={(n) => (isFinite(n) ? n.toFixed(2) : '∞') + '×'} />
            </div>
            <div className="text-xs text-lp-text-muted">ROI дисконта</div>
            <div className="mt-2 text-sm font-semibold tabular-nums text-lp-dark">
              <AnimatedNumber value={item.netMargin} format={fmtM} />
            </div>
            <div className="text-xs text-lp-text-muted">Net Margin</div>
            {result.bestByRoi === item.category && (
              <div className="mt-2 inline-block rounded-full bg-lp-yellow/20 px-2 py-0.5 text-xs font-medium text-lp-dark">
                Лучший ROI
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Grouped bar chart */}
      <div className="rounded-xl border border-lp-border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-xs font-semibold text-lp-text-muted uppercase tracking-wide">
            Сравнение категорий, млн ₽
          </h3>
          <span className="text-xs text-lp-text-muted">Всегда все 3 категории</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
            <XAxis dataKey="category" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [Number(v).toLocaleString('ru-RU') + ' млн ₽']} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Выручка" fill="#C4C4C4" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Gross Margin" fill="#FDC300" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Net Margin" fill="#2F3738" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Дисконт" fill="#B84A4A" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-lp-border bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-lp-muted">
            <tr>
              {['Категория', 'Выручка', 'Gross Margin', 'Дисконт', 'Net Margin', 'ROI'].map((h) => (
                <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-lp-text-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.items.map((item) => (
              <tr key={item.category} className="border-t border-lp-border">
                <td className="px-4 py-2 font-medium text-lp-dark">{CAT_LABELS[item.category]}</td>
                <td className="px-4 py-2 tabular-nums text-lp-dark">{fmtM(item.novoselRevenue)}</td>
                <td className="px-4 py-2 tabular-nums text-lp-dark">{fmtM(item.grossMargin)}</td>
                <td className="px-4 py-2 tabular-nums text-lp-danger">{fmtM(item.discountCost)}</td>
                <td className="px-4 py-2 tabular-nums font-semibold text-lp-dark">{fmtM(item.netMargin)}</td>
                <td className="px-4 py-2 tabular-nums font-bold text-lp-dark">
                  {isFinite(item.roiDiscount) ? item.roiDiscount.toFixed(2) + '×' : '∞×'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
