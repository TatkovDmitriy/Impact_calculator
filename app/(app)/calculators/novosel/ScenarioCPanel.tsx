'use client';

import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { ScenarioCResult } from '@/lib/calculators/novosel/types';

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

interface Props {
  result: ScenarioCResult;
}

export function ScenarioCPanel({ result }: Props) {
  const [metric, setMetric] = useState<TrendMetric>('aov');

  const trendData = result.trend.map(({ month, byCategory }) => {
    const row: Record<string, number | string> = { month };
    for (const [cat, vals] of Object.entries(byCategory)) {
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

  const novoselLines = metric === 'share'
    ? ['Кухня доля', 'Ванная доля', 'Хранение доля']
    : ['Кухня Нов', 'Ванная Нов', 'Хранение Нов'];
  const nonNovoselLines = metric === 'share' ? [] : ['Кухня Не нов', 'Ванная Не нов', 'Хранение Не нов'];
  const allLines = [...novoselLines, ...nonNovoselLines];

  const NOV_COLORS = ['#FDC300', '#2F3738', '#8B8B8B'];
  const NON_COLORS = ['#C4C4C4', '#5A6166', '#AAAAAA'];

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
            {novoselLines.map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} stroke={NOV_COLORS[i]} strokeWidth={2} dot={{ r: 3 }} />
            ))}
            {nonNovoselLines.map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} stroke={NON_COLORS[i]} strokeWidth={1.5} strokeDasharray="4 2" dot={{ r: 2 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
