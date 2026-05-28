'use client';

import { motion } from 'framer-motion';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownRight, ArrowUpRight, BellRing } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

const sample = [
  { d: 'Jan', v: 1199 },
  { d: 'Feb', v: 1149 },
  { d: 'Mar', v: 1089 },
  { d: 'Apr', v: 1049 },
  { d: 'May', v: 1029 },
  { d: 'Jun', v: 999 },
  { d: 'Jul', v: 929 },
  { d: 'Aug', v: 899 },
];

export function LandingPricePreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="relative mx-auto max-w-5xl"
    >
      <div className="absolute inset-x-12 -bottom-8 h-32 bg-primary/30 blur-3xl rounded-full" />
      <div className="glass-strong relative overflow-hidden rounded-2xl border-border/80 p-1 shadow-2xl">
        <div className="grid grid-cols-1 gap-1 lg:grid-cols-[1.4fr_1fr]">
          {/* Chart */}
          <div className="rounded-xl bg-background/60 p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  iPhone 15 Pro · 256GB
                </p>
                <div className="mt-1 flex items-baseline gap-3">
                  <span className="text-3xl font-semibold">$899</span>
                  <Badge variant="success">
                    <ArrowDownRight className="h-3 w-3" /> 25% / 8 mo
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {['7d', '30d', '90d', 'All'].map((r, i) => (
                  <button
                    key={r}
                    className={`rounded-md px-2 py-1 text-xs ${
                      i === 3 ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 h-56">
              <ResponsiveContainer>
                <AreaChart data={sample} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="lp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="d"
                    tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15,16,22,0.85)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => formatCurrency(v)}
                  />
                  <Area type="monotone" dataKey="v" stroke="#6366f1" fill="url(#lp)" strokeWidth={2.4} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Side panel */}
          <div className="rounded-xl bg-background/40 p-6 space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Marketplaces</p>
              <div className="mt-3 space-y-2.5">
                {[
                  { name: 'FakeStore', price: 899, change: -8 },
                  { name: 'DummyJSON', price: 919, change: -3 },
                  { name: 'Amazon', price: 949, change: 1 },
                ].map((m) => (
                  <div
                    key={m.name}
                    className="flex items-center justify-between rounded-lg bg-card/60 px-3 py-2 text-sm border border-border/40"
                  >
                    <span className="font-medium">{m.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{formatCurrency(m.price)}</span>
                      <span
                        className={`inline-flex items-center text-xs ${
                          m.change < 0 ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                      >
                        {m.change < 0 ? (
                          <ArrowDownRight className="h-3 w-3" />
                        ) : (
                          <ArrowUpRight className="h-3 w-3" />
                        )}
                        {Math.abs(m.change)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
              <div className="flex items-center gap-2 text-emerald-500">
                <BellRing className="h-4 w-4" />
                <span className="font-medium">Alert triggered</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Dropped below your $900 threshold on FakeStore.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
