'use client';

import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { ScenarioCResult, Category } from '@/lib/calculators/novosel/types';

const CAT_LABELS: Record<string, string> = {
  kitchen: 'Кухня',
  bathroom: 'Ванная',
  storage: 'Хранение',
};

type TrendMetric = 'aov' | 'conversion' | 'share';

const METRIC_LABELS: Record<TrendMetric, string> = {
  aov: 'AOV (₽)',
  conversion: 'Конверсия (%)',
  share: 'Доля Новоселов (%)',
};

const ALL_CATS: Category[] = ['kitchen', 'bathroom', 'storage'];

interface Props {
  result: ScenarioCResult;
  category: Category | 'all';
}

export function ScenarioCPanel({ result, category }: Props) {
  const [metric, setMetric] = useState<TrendMetric>('aov');

  const catsToShow: Category[] = category === 'all' ? ALL_CATS : [category];

  const trendData = result.trend.map(({ month, byCategory }) => {
    const row: Record<string, number | string> = { month };
    for (const cat of catsToShow) {
      const vals = byCategory[cat];
      if (metric === 'aov') {
        row[`${CAT_LABELS[cat]} Нов`] = vals.novoselAov;
        row[`${CAT_LABELS[cat]} Не нов`] = vals.nonNovoselAov;
      } else if (metric === 'conversion') {
        row[`${CAT_LABELS[cat]} Нов`] = Math.round(vals.novoselConversion * 1000) / 10;
        row[`${CAT_LABELS[cat]} Не нов`] = Math.round(vals.nonNovoselConversion * 1000) / 10;
      } else {
        row[`${CAT_LABELS[cat]} доля`] = Math.round(vals.novoselShare * 1000) / 10;
      }
    }
    return row;
  });

  const NOV_COLORS: Record<Category, string> = { kitchen: '#FDC300', bathroom: '#2F3738', storage: '#8B8B8B' };
  const NON_COLORS: Record<Category, string> = { kitchen: '#C4C4C4', bathroom: '#5A6166', storage: '#AAAAAA' };

  return (
    <div className="flex flex-col gap-4">
      {/* Premium table */}
      <div className="rounded-xl border border-lp-border bg-white shadow-sm overflow-hidden">
        <div className="bg-lp-muted px-4 py-2">
          <h3 className="text-xs font-semibold text-lp-text-muted uppercase tracking-wide">
            Премиум Новоселов vs Не Новоселов (апрель 2026)
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead className="border-t border-lp-border">
            <tr>
              {['Категория', 'AOV +%', 'Конв +пп', 'Выручка/сделку +%'].map((h) => (
                <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-lp-text-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.premiums.map((p) => (
              <tr key={p.category} className="border-t border-lp-border">
                <td className="px-4 py-2 font-medium text-lp-dark">{CAT_LABELS[p.category]}</td>
                <td className="px-4 py-2 font-semibold tabular-nums" style={{ color: '#2F3738' }}>
                  +{(p.aovPremiumPct * 100).toFixed(1)}%
                </td>
                <td className="px-4 py-2 font-semibold tabular-nums" style={{ color: '#2F3738' }}>
                  +{p.convLiftPp.toFixed(1)} пп
                </td>
                <td className="px-4 py-2 font-semibold tabular-nums" style={{ color: '#2F3738' }}>
                  +{(p.revenuePerDealPremiumPct * 100).toFixed(0)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Client metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-lp-border bg-white p-4 shadow-sm">
          <div className="text-xs text-lp-text-muted mb-1">Проектов/клиент</div>
          <div className="flex items-end gap-3">
            <div>
              <div className="text-xl font-bold text-lp-dark">{result.clientMetrics.novoselProjectsPerClient.toFixed(2)}</div>
              <div className="text-xs text-lp-text-muted">Новосел</div>
            </div>
            <div className="text-sm text-lp-text-muted pb-1">vs</div>
            <div>
              <div className="text-xl font-bold text-lp-text-muted">{result.clientMetrics.nonNovoselProjectsPerClient.toFixed(2)}</div>
              <div className="text-xs text-lp-text-muted">Не Новосел</div>
            </div>
          </div>
          <div className="mt-1 text-xs font-medium text-lp-dark">
            +{(result.clientMetrics.projectsPerClientLift * 100).toFixed(1)}% lift
          </div>
        </div>
        <div className="rounded-xl border border-lp-border bg-white p-4 shadow-sm">
          <div className="text-xs text-lp-text-muted mb-1">Оплачено/клиент</div>
          <div className="flex items-end gap-3">
            <div>
              <div className="text-xl font-bold text-lp-dark">{result.clientMetrics.novoselPaidPerClient.toFixed(2)}</div>
              <div className="text-xs text-lp-text-muted">Новосел</div>
            </div>
            <div className="text-sm text-lp-text-muted pb-1">vs</div>
            <div>
              <div className="text-xl font-bold text-lp-text-muted">{result.clientMetrics.nonNovoselPaidPerClient.toFixed(2)}</div>
              <div className="text-xs text-lp-text-muted">Не Новосел</div>
            </div>
          </div>
          <div className="mt-1 text-xs font-medium text-lp-dark">
            +{(result.clientMetrics.paidPerClientLift * 100).toFixed(1)}% lift
          </div>
        </div>
      </div>

      {/* Trend chart */}
      <div className="rounded-xl border border-lp-border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-lp-text-muted uppercase tracking-wide">
            Динамика тренда — {METRIC_LABELS[metric]}
          </h3>
          <div className="flex gap-1">
            {(Object.keys(METRIC_LABELS) as TrendMetric[]).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  metric === m
                    ? 'bg-lp-yellow text-lp-dark'
                    : 'text-lp-text-muted hover:bg-lp-muted hover:text-lp-dark'
                }`}
              >
                {m === 'aov' ? 'AOV' : m === 'conversion' ? 'Конверсия' : 'Доля'}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trendData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {catsToShow.map((cat) => {
              const novKey = metric === 'share' ? `${CAT_LABELS[cat]} доля` : `${CAT_LABELS[cat]} Нов`;
              return <Line key={novKey} type="monotone" dataKey={novKey} stroke={NOV_COLORS[cat]} strokeWidth={2} dot={{ r: 3 }} />;
            })}
            {metric !== 'share' && catsToShow.map((cat) => {
              const nonKey = `${CAT_LABELS[cat]} Не нов`;
              return <Line key={nonKey} type="monotone" dataKey={nonKey} stroke={NON_COLORS[cat]} strokeWidth={1.5} strokeDasharray="4 2" dot={{ r: 2 }} />;
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
