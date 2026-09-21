'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';

export interface WeightPoint {
  date: string;
  weightKg: number;
}

export function WeightChart({
  data,
  targetWeightKg,
}: {
  data: WeightPoint[];
  targetWeightKg: number;
}) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">No weight entries yet.</p>;
  }

  const weights = data.map((d) => d.weightKg).concat(targetWeightKg);
  const min = Math.floor(Math.min(...weights) - 1);
  const max = Math.ceil(Math.max(...weights) + 1);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickFormatter={(d: string) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        />
        <YAxis domain={[min, max]} tick={{ fontSize: 11 }} width={40} />
        <Tooltip
          labelFormatter={(d: string) => new Date(d).toLocaleDateString()}
          formatter={(value: number) => [`${value} kg`, 'Weight']}
        />
        <ReferenceLine
          y={targetWeightKg}
          stroke="#16a35d"
          strokeDasharray="4 4"
          label={{ value: 'Target', position: 'insideTopRight', fontSize: 11, fill: '#16a35d' }}
        />
        <Line type="monotone" dataKey="weightKg" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
