'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PriceHistoryResponse } from '@/features/prices/prices.api';
import { formatCurrency } from '@/lib/utils';

const PALETTE = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4'];

interface Props {
  data: PriceHistoryResponse;
}

export function PriceHistoryChart({ data }: Props) {
  // Pivot series to a single dataset keyed by date.
  const dateSet = new Set<string>();
  data.series.forEach((s) => s.points.forEach((p) => dateSet.add(p.date.substring(0, 10))));
  const sortedDates = [...dateSet].sort();

  const pivoted = sortedDates.map((date) => {
    const row: Record<string, any> = { date };
    data.series.forEach((s) => {
      const point = s.points.find((p) => p.date.substring(0, 10) === date);
      row[s.marketplaceSlug] = point?.price ?? null;
    });
    return row;
  });

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer>
        <LineChart data={pivoted} margin={{ left: -8, right: 12, top: 8, bottom: 0 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.4} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) =>
              new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            }
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatCurrency(v).replace('.00', '')}
            width={60}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
            formatter={(v: any) => (v ? formatCurrency(Number(v)) : '—')}
          />
          <Legend
            verticalAlign="top"
            height={28}
            iconType="circle"
            wrapperStyle={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}
          />
          {data.series.map((s, idx) => (
            <Line
              key={s.marketplaceSlug}
              type="monotone"
              dataKey={s.marketplaceSlug}
              name={s.marketplaceName}
              stroke={PALETTE[idx % PALETTE.length]}
              strokeWidth={2.4}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
