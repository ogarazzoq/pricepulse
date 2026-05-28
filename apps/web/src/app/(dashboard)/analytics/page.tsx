'use client';

import { useQuery } from '@tanstack/react-query';
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Deep insights into trending products, biggest discounts, and marketplace economics.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Average price by marketplace
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px]" />
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer>
                  <BarChart
                    data={data?.cheapestMarketplaces ?? []}
                    margin={{ left: -8, right: 12, top: 8, bottom: 0 }}
                  >
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.4} vertical={false} />
                    <XAxis
                      dataKey="marketplaceName"
                      tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={(v: any) => formatCurrency(Number(v))}
                    />
                    <Bar dataKey="averagePrice" radius={[8, 8, 0, 0]}>
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-500" /> Trending products
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {isLoading ? (
              [...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)
            ) : (
              data?.trending.map((t, i) => (
                <Link
                  href={`/products/${t.productId}`}
                  key={t.productId}
                  className="flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 px-3 py-2.5 transition hover:border-primary/30"
                >
                  <span className="text-xs text-muted-foreground w-5 text-center">#{i + 1}</span>
                  <div className="relative h-10 w-10 overflow-hidden rounded-md bg-muted">
                    {t.imageUrl && (
                      <Image src={t.imageUrl} alt={t.title} fill sizes="40px" className="object-contain p-1" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.title}</p>
                    <p className="text-[11px] text-muted-foreground">{formatNumber(t.views)} views</p>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-emerald-500" /> Recent price drops
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40" />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {data?.recentDrops.map((r, i) => (
                <Link
                  key={`${r.productId}-${i}`}
                  href={`/products/${r.productId}`}
                  className="rounded-xl border border-border/40 bg-card/40 p-4 transition hover:border-emerald-500/30"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative h-12 w-12 overflow-hidden rounded-md bg-muted">
                      {r.imageUrl && (
                        <Image src={r.imageUrl} alt={r.title} fill sizes="48px" className="object-contain p-1" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium">{r.title}</p>
                      <Badge variant="success" className="mt-1">
                        − {formatCurrency(r.previousPrice - r.currentPrice)}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="line-through">{formatCurrency(r.previousPrice)}</span>
                    <span className="font-mono text-base font-semibold text-foreground">
                      {formatCurrency(r.currentPrice)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
