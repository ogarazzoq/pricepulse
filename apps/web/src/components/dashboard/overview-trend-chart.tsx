'use client';

import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/**
 * Synthetic 14-day “price index” chart used for the overview section.
 * In production this would consume an aggregated index endpoint.
 */
export function OverviewTrendChart() {
  const data = useMemo(() => {
    const days = 14;
    const result: { date: string; index: number }[] = [];
    let v = 100;
    const today = new Date();
    for (let i = days; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      v += Math.random() * 4 - 2.5;
      result.push({
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        index: Number(v.toFixed(2)),
      });
    }
    return result;
  }, []);

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ left: -8, right: 12, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="ovTrend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.4} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.5 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.5 }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 12,
              fontSize: 12,
            }}
            labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
          />
          <Area type="monotone" dataKey="index" stroke="#6366f1" fill="url(#ovTrend)" strokeWidth={2.4} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
