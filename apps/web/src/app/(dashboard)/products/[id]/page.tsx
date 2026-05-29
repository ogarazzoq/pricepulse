'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { ArrowDownRight, BellPlus, TrendingDown, TrendingUp } from 'lucide-react';
import { productsApi } from '@/features/products/products.api';
import { pricesApi, type PriceRange } from '@/features/prices/prices.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatCard } from '@/components/ui/stat-card';
import { PriceHistoryChart } from '@/components/products/price-history-chart';
import { OfferComparison } from '@/components/products/offer-comparison';
import { CreateAlertDialog } from '@/components/alerts/create-alert-dialog';
import { formatCurrency, formatPercent } from '@/lib/utils';

const RANGES: { id: PriceRange; label: string }[] = [
  { id: '7d', label: '7d' },
  { id: '30d', label: '30d' },
  { id: '90d', label: '90d' },
  { id: '365d', label: '1y' },
  { id: 'all', label: 'All' },
];

export default function ProductDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [range, setRange] = useState<PriceRange>('30d');
  const [alertOpen, setAlertOpen] = useState(false);

  const product = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.byId(id),
    enabled: !!id,
  });

  const history = useQuery({
    queryKey: ['price-history', id, range],
    queryFn: () => pricesApi.history(id, range),
    enabled: !!id,
  });

  if (product.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-2/3" />
        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!product.data) return null;

  const p = product.data;
  const stats = history.data?.stats;
  const trendDown = (stats?.change30d ?? 0) <= 0;
  const lowestOffer = p.offers
    .filter((o) => o.priceAvailable !== false)
    .sort((a, b) => a.currentPrice - b.currentPrice)[0];

  return (
    <div className="space-y-6">
      {/* TOP META + CTA */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {p.category && (
            <Badge variant="outline" className="capitalize">
              {p.category}
            </Badge>
          )}
          {p.brand && <Badge variant="secondary">{p.brand}</Badge>}
        </div>
        <Button
          variant="gradient"
          onClick={() => setAlertOpen(true)}
          className="ml-auto sm:ml-0"
        >
          <BellPlus className="h-4 w-4" aria-hidden="true" /> Create alert
        </Button>
      </header>

      {/* HERO + CHART */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,_420px)_minmax(0,_1fr)]">
        <Card>
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted/30">
              {p.imageUrl && (
                <Image
                  src={p.imageUrl}
                  alt={p.title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 420px"
                  className="object-contain p-4 sm:p-6"
                />
              )}
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight sm:text-xl">{p.title}</h1>
              {p.description && (
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                  {p.description}
                </p>
              )}
            </div>
            {lowestOffer && (
              <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Best price</p>
                <div className="mt-1 flex items-baseline gap-3 flex-wrap">
                  <span className="font-mono text-2xl font-semibold tabular-nums sm:text-3xl">
                    {formatCurrency(lowestOffer.currentPrice, lowestOffer.currency)}
                  </span>
                  {lowestOffer.discountPercent != null && Number(lowestOffer.discountPercent) > 0 && (
                    <Badge variant="success">
                      <ArrowDownRight className="h-3 w-3" aria-hidden="true" /> −
                      {Number(lowestOffer.discountPercent).toFixed(0)}%
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  on{' '}
                  <span className="font-medium text-foreground">
                    {lowestOffer.marketplace.name}
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <CardTitle>Price history</CardTitle>
                <p className="text-xs text-muted-foreground">
                  All marketplaces, normalized in USD
                </p>
              </div>
              <Tabs value={range} onValueChange={(v) => setRange(v as PriceRange)}>
                <TabsList className="overflow-x-auto">
                  {RANGES.map((r) => (
                    <TabsTrigger key={r.id} value={r.id}>
                      {r.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              {history.isLoading ? (
                <Skeleton className="h-[260px] w-full sm:h-[280px]" />
              ) : history.data && history.data.series.some((s) => s.points.length > 0) ? (
                <PriceHistoryChart data={history.data} />
              ) : (
                <div className="flex h-[260px] items-center justify-center rounded-lg border border-dashed border-border/60 px-4 text-center text-sm text-muted-foreground sm:h-[280px]">
                  Not enough history yet — check back after the next price sync.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Lowest"
              value={stats ? formatCurrency(stats.lowest) : '—'}
              accent="success"
              icon={<TrendingDown className="h-4 w-4" />}
            />
            <StatCard
              label="Highest"
              value={stats ? formatCurrency(stats.highest) : '—'}
              accent="warning"
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <StatCard label="Average" value={stats ? formatCurrency(stats.average) : '—'} accent="brand" />
            <StatCard
              label="30d change"
              value={stats ? formatPercent(stats.changePercent30d) : '—'}
              accent={trendDown ? 'success' : 'danger'}
              delta={
                stats && stats.changePercent30d !== 0
                  ? { value: stats.changePercent30d, label: 'vs prev period' }
                  : undefined
              }
            />
          </div>
        </div>
      </div>

      {/* COMPARISON */}
      <section aria-labelledby="comparison-heading" className="space-y-3">
        <div>
          <h2 id="comparison-heading" className="text-base font-semibold sm:text-lg">
            Compare marketplaces
          </h2>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Live offers, ranked by price. The best deal is highlighted.
          </p>
        </div>
        <OfferComparison offers={p.offers} />
      </section>

      <CreateAlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        productId={p.id}
        productTitle={p.title}
        suggestedThreshold={lowestOffer ? Math.round(lowestOffer.currentPrice * 0.9) : 0}
      />
    </div>
  );
}
