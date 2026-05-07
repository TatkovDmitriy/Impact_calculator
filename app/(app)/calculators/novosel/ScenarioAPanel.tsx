'use client';

import { useMemo } from 'react';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { computeScenarioA } from '@/lib/calculators/novosel/formulas';
import { NOVOSEL_BASELINE } from '@/lib/calculators/novosel/baseline';
import type { NovoselInputs, ScenarioAResult } from '@/lib/calculators/novosel/types';
import { AnimatedNumber } from './AnimatedNumber';

function fmtM(n: number) {
  const sign = n < 0 ? '−' : n > 0 ? '+' : '';
  return sign + (Math.abs(n) / 1_000_000).toFixed(1).replace('.', ',') + ' млн ₽';
}
function fmtRub(n: number) {
  return Math.round(n).toLocaleString('ru-RU') + ' ₽';
}
function fmtRoi(n: number) {
  if (!isFinite(n)) return '∞×';
  return n.toFixed(2) + '×';
}

interface KpiCardProps {
  label: string;
  value: number;
  format: (n: number) => string;
  positive?: boolean;
  negative?: boolean;
}

function KpiCard({ label, value, format, positive, negative }: KpiCardProps) {
  const color = positive ? 'text-lp-dark' : negative ? 'text-lp-danger' : 'text-lp-dark';
  return (
    <div className="rounded-xl border border-lp-border bg-white p-4 shadow-sm">
      <div className="mb-1 text-xs font-medium text-lp-text-muted">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${color}`}>
        <AnimatedNumber value={value} format={format} />
      </div>
    </div>
  );
}

interface Props {
  inputs: NovoselInputs;
  result: ScenarioAResult;
}

export function ScenarioAPanel({ inputs, result }: Props) {
  const sensitivityData = useMemo(() => {
    return Array.from({ length: 46 }, (_, i) => {
      const share = 0.05 + i * 0.01;
      const r = computeScenarioA(
        { ...inputs, targetNovoselShare: share },
        NOVOSEL_BASELINE
      );
      return {
        share: Math.round(share * 100),
        deltaNetMargin: Math.round(r.deltaNetMargin / 1_000_000),
        roiDiscount: parseFloat(isFinite(r.roiDiscount) ? r.roiDiscount.toFixed(2) : '0'),
      };
    });
  }, [inputs]);

  const barData = [
    { name: 'Baseline Net Margin', value: Math.round(result.baselineNetMargin / 1_000_000), fill: '#8B8B8B' },
    { name: 'Сценарий Net Margin', value: Math.round(result.scenarioNetMargin / 1_000_000), fill: '#FDC300' },
    { name: 'Стоимость дисконта', value: Math.round(result.discountCost / 1_000_000), fill: '#B84A4A' },
  ];

  const roiPositive = result.roiDiscount >= 1;

  return (
    <div className="flex flex-col gap-4">
      {/* Warning */}
      {result.warning === 'cap_hit' && (
        <div className="flex items-start gap-2 rounded-xl border border-lp-yellow/40 bg-lp-yellow/10 px-4 py-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-lp-dark" />
          <div className="text-sm text-lp-dark">
            <span className="font-semibold">Дисконт достиг капа.</span>{' '}
            Bathroom: 10 000 ₽/проект (2 промокода → до 20 000 ₽/клиента).
            Kitchen: кап не задействован.
          </div>
        </div>
      )}
      {result.warning === 'roi_negative' && (
        <div className="flex items-start gap-2 rounded-xl border border-lp-danger/30 bg-lp-danger/10 px-4 py-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-lp-danger" />
          <div className="text-sm text-lp-danger font-medium">
            ROI &lt; 1 — программа убыточна при текущих параметрах.
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          label="Δ Выручка"
          value={result.deltaRevenue}
          format={fmtM}
          positive={result.deltaRevenue > 0}
          negative={result.deltaRevenue < 0}
        />
        <KpiCard
          label="Δ Net Margin"
          value={result.deltaNetMargin}
          format={fmtM}
          positive={result.deltaNetMargin > 0}
          negative={result.deltaNetMargin < 0}
        />
        <KpiCard
          label="ROI дисконта"
          value={isFinite(result.roiDiscount) ? result.roiDiscount : 99}
          format={(n) => (n >= 99 ? '∞×' : n.toFixed(2) + '×')}
          positive={roiPositive}
          negative={!roiPositive}
        />
        <KpiCard
          label="Стоимость программы"
          value={result.discountCost}
          format={fmtM}
        />
      </div>

      {/* Bar comparison */}
      <div className="rounded-xl border border-lp-border bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-xs font-semibold text-lp-text-muted uppercase tracking-wide">
          Net Margin: Baseline vs Сценарий, млн ₽
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={barData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} />
            <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
            <Tooltip formatter={(v) => [Number(v).toLocaleString('ru-RU') + ' млн ₽']} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {barData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Sensitivity chart */}
      <div className="rounded-xl border border-lp-border bg-white p-4 shadow-sm">
        <h3 className="mb-1 text-xs font-semibold text-lp-text-muted uppercase tracking-wide">
          Чувствительность: доля Новоселов → Δ Net Margin, млн ₽
        </h3>
        <p className="mb-3 text-xs text-lp-text-muted">
          Текущая доля: {Math.round(inputs.targetNovoselShare * 100)}%
          {' · '}Исторический макс: 19.4% (апр 2026)
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={sensitivityData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
            <XAxis dataKey="share" tick={{ fontSize: 11 }} tickFormatter={(v) => v + '%'} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [Number(v).toLocaleString('ru-RU') + ' млн ₽', 'Δ Net Margin']} labelFormatter={(l) => 'Доля: ' + l + '%'} />
            <ReferenceLine y={0} stroke="#B84A4A" strokeDasharray="4 2" />
            <ReferenceLine x={Math.round(inputs.targetNovoselShare * 100)} stroke="#2F3738" strokeDasharray="4 2" label={{ value: 'текущий', fontSize: 10, fill: '#6B7280' }} />
            <Line type="monotone" dataKey="deltaNetMargin" stroke="#FDC300" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
