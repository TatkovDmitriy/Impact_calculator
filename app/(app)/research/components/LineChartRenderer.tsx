'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { LineChartPayload } from '@/lib/research/types';

interface Props {
  payload: LineChartPayload;
}

const SERIES_COLORS = ['#FDC300', '#94a3b8', '#cbd5e1', '#475569'];

export function LineChartRenderer({ payload }: Props) {
  const { xAxis, series, yUnit } = payload;

  const data = xAxis.map((label, i) => {
    const point: Record<string, string | number> = { label };
    series.forEach((s) => {
      point[s.name] = s.data[i] ?? 0;
    });
    return point;
  });

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
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
          <Line
            key={s.name}
            type="monotone"
            dataKey={s.name}
            stroke={s.color ?? SERIES_COLORS[i % SERIES_COLORS.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
