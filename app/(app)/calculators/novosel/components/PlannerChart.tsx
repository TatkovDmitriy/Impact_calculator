'use client';

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { ScenarioV2Result } from '@/lib/calculators/novosel/types_v2';
import type { CategoryInput } from '@/lib/calculators/novosel/types_v2';
import { CATEGORY_COLORS } from '@/lib/calculators/novosel/constants_v2';

interface Props {
  result: ScenarioV2Result;
  categories: CategoryInput[];
}

function toM(n: number) {
  return Math.round(n / 100_000) / 10; // → one decimal place in millions
}

export function PlannerChart({ result, categories }: Props) {
  const chartData = result.monthly.map((m) => {
    const row: Record<string, number | string | boolean> = {
      month: m.month.slice(5), // '05' from '2026-05'
      isForecast: m.isForecast,
      netMargin: toM(m.netMargin),
    };
    for (const cat of categories) {
      row[cat.config.id] = toM(m.byCategory[cat.config.id] ?? 0);
    }
    return row;
  });

  const firstForecastMonth = result.monthly.find((m) => m.isForecast)?.month.slice(5);

  return (
    <div className="rounded-xl border border-lp-border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-xs font-semibold text-lp-text-muted uppercase tracking-wide">
          GMV по категориям + Чистая маржа, млн ₽
        </h3>
        <div className="flex items-center gap-3 text-xs text-lp-text-muted">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-lp-dark opacity-100" /> Факт
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-lp-yellow opacity-60" /> Прогноз
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value, name) => [
              `${Number(value).toLocaleString('ru-RU', { minimumFractionDigits: 1 })} млн ₽`,
              name,
            ]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />

          {firstForecastMonth && (
            <ReferenceLine
              yAxisId="left"
              x={firstForecastMonth}
              stroke="#FDC300"
              strokeDasharray="4 2"
              label={{ value: 'Прогноз', position: 'insideTopLeft', fontSize: 10, fill: '#6B7280' }}
            />
          )}

          {categories.map((cat, i) => (
            <Bar
              key={cat.config.id}
              yAxisId="left"
              dataKey={cat.config.id}
              name={cat.config.name}
              stackId="gmv"
              fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
              opacity={0.85}
              radius={i === categories.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
            />
          ))}

          <Line
            yAxisId="right"
            type="monotone"
            dataKey="netMargin"
            name="Чистая маржа"
            stroke="#B84A4A"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
