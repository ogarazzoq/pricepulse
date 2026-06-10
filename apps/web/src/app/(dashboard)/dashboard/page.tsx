'use client';

import { useQuery } from '@tanstack/react-query';
import { BellRing, Package, Sparkles, TrendingDown } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { analyticsApi } from '@/features/analytics/analytics.api';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { OverviewTrendChart } from '@/components/dashboard/overview-trend-chart';
import { RecentSearchesWidget } from '@/components/dashboard/recent-searches-widget';
import { TopSearchesWidget } from '@/components/dashboard/top-searches-widget';

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: analyticsApi.overview,
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Overview</h1>
          <p className="text-sm text-muted-foreground">
            A live snapshot of your tracked products, alerts, and the market.
          </p>
        </div>
        <Badge variant="outline" className="bg-card/60">
          <Sparkles className="h-3 w-3" aria-hidden="true" /> Refreshes every 30s
        </Badge>
      </div>

      {/* Stats — 2 cols on mobile, 4 on desktop */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <StatCard
              label="Tracked products"
              value={formatNumber(data?.totals.trackedProducts ?? 0)}
              icon={<Package className="h-4 w-4" />}
              accent="brand"
            />
            <StatCard
              label="Active alerts"
              value={formatNumber(data?.totals.activeAlerts ?? 0)}
              icon={<BellRing className="h-4 w-4" />}
              accent="warning"
            />
            <StatCard
              label="Drops triggered (30d)"
              value={formatNumber(data?.totals.triggeredAlerts30d ?? 0)}
              icon={<TrendingDown className="h-4 w-4" />}
              accent="success"
            />
            <StatCard
              label="Avg savings"
              value={`${data?.totals.averageSavingsPercent.toFixed(1) ?? 0}%`}
              icon={<Sparkles className="h-4 w-4" />}
              accent="brand"
            />
          </>
        )}
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent price drops</CardTitle>
            <CardDescription>Last 7 days across all marketplaces</CardDescription>
          </CardHeader>
          <CardContent>
            <OverviewTrendChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cheapest marketplaces</CardTitle>
            <CardDescription>Average price across catalog</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {data?.cheapestMarketplaces?.length ? (
              data.cheapestMarketplaces.map((m, i) => (
                <div
                  key={m.marketplaceSlug}
                  className="flex items-center justify-between rounded-lg border border-border/40 bg-card/40 px-3 py-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-[11px] font-semibold text-primary">
                      #{i + 1}
                    </div>
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-sm font-medium">{m.marketplaceName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatNumber(m.productCount)} products
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-medium tabular-nums">
                    {formatCurrency(m.averagePrice)}
                  </span>
                </div>
              ))
            ) : (
              <EmptyState title="No data yet" description="Run a price sync to populate." />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Biggest discounts</CardTitle>
            <CardDescription>Best deals across the catalog</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {data?.topDiscounts?.length ? (
              data.topDiscounts.map((d) => (
                <Link
                  key={d.productId}
                  href={`/products/${d.productId}`}
                  className="ring-focus flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 px-3 py-2.5 transition hover:border-primary/30 hover:bg-accent/40"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                    {d.imageUrl && (
                      <Image
                        src={d.imageUrl}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-contain p-1"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.title}</p>
                    <p className="text-[11px] text-muted-foreground capitalize">
                      {d.marketplaceSlug}
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-mono text-sm font-semibold tabular-nums">
                      {formatCurrency(d.currentPrice)}
                    </span>
                    <Badge variant="success">−{d.discountPercent.toFixed(0)}%</Badge>
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState title="No discounts yet" description="Sync products to see deals." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent drops</CardTitle>
            <CardDescription>Live feed from the price-sync worker</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {data?.recentDrops?.length ? (
              data.recentDrops.map((r, i) => (
                <Link
                  key={`${r.productId}-${i}`}
                  href={`/products/${r.productId}`}
                  className="ring-focus flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 px-3 py-2.5 transition hover:border-emerald-500/30 hover:bg-accent/40"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                    {r.imageUrl && (
                      <Image
                        src={r.imageUrl}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-contain p-1"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.title}</p>
                    <p className="text-[11px] text-muted-foreground capitalize">
                      {r.marketplaceSlug} ·{' '}
                      {new Date(r.droppedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-mono text-sm font-semibold tabular-nums">
                      {formatCurrency(r.currentPrice)}
                    </span>
                    <span className="text-[11px] text-emerald-500 tabular-nums">
                      ↓ {formatCurrency(r.previousPrice - r.currentPrice)}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState title="No drops yet" description="The first sync hasn’t run." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Search Widgets */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <RecentSearchesWidget />
        <TopSearchesWidget />
      </div>
    </div>
  );
}
