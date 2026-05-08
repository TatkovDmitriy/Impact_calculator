'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { CategoryResultV3 } from '@/lib/calculators/novosel/types_v3';

interface Props {
  result: CategoryResultV3;
  categoryName: string;
}

function toM(n: number) {
  return Math.round(n / 100_000) / 10; // millions, 1 decimal
}

const LINES = [
  { key: 'gmv', label: 'GMV', color: '#FDC300', strokeWidth: 2 },
  { key: 'margin', label: 'Маржа', color: '#2F3738', strokeWidth: 1.5 },
  { key: 'netMargin', label: 'Чистая маржа', color: '#5A6166', strokeWidth: 1.5 },
  { key: 'discountCost', label: 'Дисконт', color: '#B84A4A', strokeWidth: 1.5 },
] as const;

export function ForecastChart({ result, categoryName }: Props) {
  const chartData = result.months.map((m) => ({
    month: m.month.slice(5), // 'MM' label
    isForecast: m.isForecast,
    gmv: toM(m.gmv),
    margin: toM(m.margin),
    netMargin: toM(m.netMargin),
    discountCost: toM(m.discountCost),
  }));

  const firstForecastLabel = result.months.find((m) => m.isForecast)?.month.slice(5);

  return (
    <div className="rounded-xl border border-lp-border bg-white p-4 shadow-sm">
      <div className="mb-3">
        <div className="text-xs font-semibold text-lp-text-muted uppercase tracking-wide">
          {categoryName} — GMV / Маржа / Дисконт, млн ₽
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-lp-text-muted">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-lp-dark opacity-60" />
            Факт
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-lp-yellow opacity-60" />
            Прогноз
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={48} />
          <Tooltip
            formatter={(value, name) => [
              `${Number(value).toLocaleString('ru-RU', { minimumFractionDigits: 1 })} млн ₽`,
              name,
            ]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />

          {firstForecastLabel && (
            <ReferenceLine
              x={firstForecastLabel}
              stroke="#FDC300"
              strokeDasharray="4 2"
              label={{ value: 'Прогноз', position: 'insideTopLeft', fontSize: 10, fill: '#6B7280' }}
            />
          )}

          {LINES.map(({ key, label, color, strokeWidth }) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={label}
              stroke={color}
              strokeWidth={strokeWidth}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
