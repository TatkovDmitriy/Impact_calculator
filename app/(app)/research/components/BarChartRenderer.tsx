'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { BarChartPayload } from '@/lib/research/types';

interface Props {
  payload: BarChartPayload;
}

const SERIES_COLORS = ['#FDC300', '#2F3738', '#94a3b8', '#cbd5e1'];

export function BarChartRenderer({ payload }: Props) {
  const { xAxis, series, yUnit, stacked } = payload;

  const data = xAxis.map((label, i) => {
    const point: Record<string, string | number> = { label };
    series.forEach((s) => {
      point[s.name] = s.data[i] ?? 0;
    });
    return point;
  });

  const stackProps = stacked ? { stackId: 'stack' } : {};

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#8B8B8B' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#8B8B8B' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => (yUnit ? `${Number(v).toLocaleString('ru-RU')} ${yUnit}` : Number(v).toLocaleString('ru-RU'))}
          width={yUnit ? 72 : 48}
        />
        <Tooltip
          formatter={(v) => [Number(v).toLocaleString('ru-RU') + (yUnit ? ` ${yUnit}` : '')]}
          contentStyle={{ fontSize: 12, borderColor: '#E5E5E5' }}
        />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Bar
            key={s.name}
            dataKey={s.name}
            fill={s.color ?? SERIES_COLORS[i % SERIES_COLORS.length]}
            radius={stacked ? [0, 0, 0, 0] : [3, 3, 0, 0]}
            {...stackProps}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
