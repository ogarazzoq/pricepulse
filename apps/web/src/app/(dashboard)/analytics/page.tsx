'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Activity, Flame, TrendingDown } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { analyticsApi } from '@/features/analytics/analytics.api';
import { formatCurrency, formatNumber } from '@/lib/utils';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const PALETTE = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#a855f7'];

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-overview-page'],
    queryFn: analyticsApi.overview,
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-5 sm:space-y-6"
    >
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Deep insights into trending products, biggest discounts, and marketplace economics.
        </p>
      </motion.div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Average Price Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Activity className="h-4 w-4 text-primary" /> 
                <span className="hidden sm:inline">Average price by marketplace</span>
                <span className="sm:hidden">Avg. price</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[280px] sm:h-[300px]" />
              ) : (
                <div className="h-[280px] sm:h-[300px] -mx-2 sm:mx-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data?.cheapestMarketplaces ?? []}
                      margin={{ left: -12, right: 4, top: 8, bottom: 0 }}
                    >
                      <CartesianGrid 
                        stroke="hsl(var(--border))" 
                        strokeDasharray="3 3" 
                        opacity={0.4} 
                        vertical={false} 
                      />
                      <XAxis
                        dataKey="marketplaceName"
                        tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.6 }}
                        tickLine={false}
                        axisLine={false}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.6 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `$${v}`}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 8,
                          fontSize: 11,
                          padding: '6px 10px',
                        }}
                        formatter={(v: any) => [formatCurrency(Number(v)), 'Avg Price']}
                        cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                      />
                      <Bar dataKey="averagePrice" radius={[6, 6, 0, 0]} maxBarSize={60}>
                        {(data?.cheapestMarketplaces ?? []).map((_, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Trending Products */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Flame className="h-4 w-4 text-amber-500" /> Trending products
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                [...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 sm:h-14" />)
              ) : (
                data?.trending.map((t, i) => (
                  <motion.div
                    key={t.productId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * i, duration: 0.3 }}
                  >
                    <Link
                      href={`/products/${t.productId}`}
                      className="flex items-center gap-2 sm:gap-3 rounded-lg border border-border/40 bg-card/40 px-2 sm:px-3 py-2 transition hover:border-primary/30 hover:shadow-sm"
                    >
                      <span className="text-[10px] sm:text-xs text-muted-foreground w-4 sm:w-5 text-center font-mono">
                        #{i + 1}
                      </span>
                      <motion.div 
                        whileHover={{ scale: 1.1 }}
                        className="relative h-9 w-9 sm:h-10 sm:w-10 overflow-hidden rounded-md bg-muted flex-shrink-0"
                      >
                        {t.imageUrl && (
                          <Image 
                            src={t.imageUrl} 
                            alt={t.title} 
                            fill 
                            sizes="40px" 
                            className="object-contain p-1" 
                          />
                        )}
                      </motion.div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs sm:text-sm font-medium">{t.title}</p>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground">
                          {formatNumber(t.views)} views
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Price Drops */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TrendingDown className="h-4 w-4 text-emerald-500" /> Recent price drops
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-32 sm:h-40" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data?.recentDrops.map((r, i) => (
                  <motion.div
                    key={`${r.productId}-${i}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 * i, duration: 0.3 }}
                  >
                    <Link
                      href={`/products/${r.productId}`}
                      className="block rounded-xl border border-border/40 bg-card/40 p-3 sm:p-4 transition hover:border-emerald-500/30 hover:shadow-md"
                    >
                      <div className="flex items-start gap-2 sm:gap-3">
                        <motion.div 
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          className="relative h-10 w-10 sm:h-12 sm:w-12 overflow-hidden rounded-md bg-muted flex-shrink-0"
                        >
                          {r.imageUrl && (
                            <Image 
                              src={r.imageUrl} 
                              alt={r.title} 
                              fill 
                              sizes="48px" 
                              className="object-contain p-1" 
                            />
                          )}
                        </motion.div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-xs sm:text-sm font-medium leading-tight">
                            {r.title}
                          </p>
                          <Badge variant="success" className="mt-1 text-[10px] sm:text-xs">
                            − {formatCurrency(r.previousPrice - r.currentPrice)}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-2 sm:mt-3 flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground">
                        <span className="line-through">{formatCurrency(r.previousPrice)}</span>
                        <span className="font-mono text-sm sm:text-base font-semibold text-foreground">
                          {formatCurrency(r.currentPrice)}
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
