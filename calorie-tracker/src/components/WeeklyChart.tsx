'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

export interface WeeklyPoint {
  date: string;
  calories: number;
}

export function WeeklyChart({ data, target }: { data: WeeklyPoint[]; target: number }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickFormatter={(d: string) => new Date(d).toLocaleDateString(undefined, { weekday: 'short' })}
        />
        <YAxis tick={{ fontSize: 11 }} width={40} />
        <Tooltip
          labelFormatter={(d: string) => new Date(d).toLocaleDateString()}
          formatter={(value: number) => [`${Math.round(value)} kcal`, 'Eaten']}
        />
        <ReferenceLine y={target} stroke="#6b7280" strokeDasharray="4 4" />
        <Bar dataKey="calories" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.calories > target ? '#dc2626' : '#16a35d'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
