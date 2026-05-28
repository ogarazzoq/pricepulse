'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { ArrowDownRight, BellPlus, ExternalLink, Star, TrendingDown, TrendingUp } from 'lucide-react';
import { productsApi } from '@/features/products/products.api';
import { pricesApi, type PriceRange } from '@/features/prices/prices.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatCard } from '@/components/ui/stat-card';
import { PriceHistoryChart } from '@/components/products/price-history-chart';
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
        <Skeleton className="h-12 w-1/2" />
        <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!product.data) return null;

  const p = product.data;
  const best = p.offers[0];
  const stats = history.data?.stats;
  const trendDown = (stats?.change30d ?? 0) <= 0;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          {p.category && <Badge variant="outline" className="capitalize">{p.category}</Badge>}
          {p.brand && <Badge variant="secondary">{p.brand}</Badge>}
        </div>
        <Button variant="gradient" onClick={() => setAlertOpen(true)}>
          <BellPlus className="h-4 w-4" /> Create alert
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        {/* PRODUCT CARD */}
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted/30">
              {p.imageUrl && (
                <Image src={p.imageUrl} alt={p.title} fill sizes="420px" className="object-contain p-6" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-semibold leading-tight">{p.title}</h1>
              {p.description && (
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.description}</p>
              )}
            </div>
            {best && (
              <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Best price</p>
                <div className="mt-1 flex items-baseline gap-3">
                  <span className="text-3xl font-semibold">{formatCurrency(best.currentPrice, best.currency)}</span>
                  {best.discountPercent && (
                    <Badge variant="success">
                      <ArrowDownRight className="h-3 w-3" /> −{Number(best.discountPercent).toFixed(0)}%
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  on <span className="font-medium text-foreground">{best.marketplace.name}</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* CHART + STATS */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Price history</CardTitle>
                <p className="text-xs text-muted-foreground">All marketplaces, normalized in USD</p>
              </div>
              <Tabs value={range} onValueChange={(v) => setRange(v as PriceRange)}>
                <TabsList>
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
                <Skeleton className="h-[280px] w-full" />
              ) : history.data && history.data.series.some((s) => s.points.length > 0) ? (
                <PriceHistoryChart data={history.data} />
              ) : (
                <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-border/60 text-sm text-muted-foreground">
                  Not enough history yet — check back after the next price sync.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-4">
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
            <StatCard
              label="Average"
              value={stats ? formatCurrency(stats.average) : '—'}
              accent="brand"
            />
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

      {/* OFFERS TABLE */}
      <Card>
        <CardHeader>
          <CardTitle>Marketplaces</CardTitle>
          <p className="text-xs text-muted-foreground">Live offers for this product</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Marketplace</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Last synced</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {p.offers.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.marketplace.name}</TableCell>
                  <TableCell className="font-mono">
                    {formatCurrency(o.currentPrice, o.currency)}
                    {o.originalPrice && (
                      <span className="ml-2 text-xs text-muted-foreground line-through">
                        {formatCurrency(Number(o.originalPrice), o.currency)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {o.discountPercent ? (
                      <Badge variant="success">−{Number(o.discountPercent).toFixed(0)}%</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {o.rating ? (
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {Number(o.rating).toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {o.inStock ? (
                      <Badge variant="success">In stock{o.stockCount ? ` · ${o.stockCount}` : ''}</Badge>
                    ) : (
                      <Badge variant="danger">Out of stock</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(o.lastSyncedAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {o.url && (
                      <a
                        href={o.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreateAlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        productId={p.id}
        productTitle={p.title}
        suggestedThreshold={best ? Math.round(best.currentPrice * 0.9) : 0}
      />
    </div>
  );
}
