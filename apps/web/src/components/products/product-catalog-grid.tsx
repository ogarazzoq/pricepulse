'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Star, Store } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/features/products/products.api';

interface Props {
  items: Product[];
}

export function ProductCatalogGrid({ items }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((p) => {
        const lowest = p.offers[0];
        const bestRating = p.offers
          .map((o) => o.rating)
          .filter((r): r is number => r != null)
          .reduce((max, r) => Math.max(max, r), 0);
        const spread =
          p.lowestPrice != null && p.highestPrice != null && p.highestPrice > p.lowestPrice
            ? p.highestPrice - p.lowestPrice
            : 0;

        return (
          <Link key={p.id} href={`/products/${p.id}`}>
            <Card className="group h-full overflow-hidden transition hover:border-primary/40 hover:shadow-[0_8px_28px_-12px_hsl(var(--primary)/0.4)]">
              <div className="relative aspect-[4/3] bg-muted/40">
                {p.imageUrl && (
                  <Image
                    src={p.imageUrl}
                    alt={p.title}
                    fill
                    sizes="(max-width: 640px) 100vw, 25vw"
                    className="object-contain p-4 transition group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
                  <Badge variant="outline" className="bg-background/70 backdrop-blur">
                    <Store className="h-3 w-3" /> {p.offers.length}
                  </Badge>
                  {lowest?.discountPercent != null && Number(lowest.discountPercent) > 0 && (
                    <Badge variant="success">−{Number(lowest.discountPercent).toFixed(0)}%</Badge>
                  )}
                </div>
              </div>
              <CardContent className="space-y-2 p-4">
                <p className="line-clamp-2 text-sm font-medium leading-tight">{p.title}</p>
                <div className="flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    {lowest && (
                      <>
                        <p className="text-[11px] text-muted-foreground">From</p>
                        <p className="font-mono text-base font-semibold">
                          {formatCurrency(lowest.currentPrice, lowest.currency)}
                        </p>
                        {spread > 0 && (
                          <p className="text-[10px] text-muted-foreground">
                            spread{' '}
                            <span className="text-emerald-500">{formatCurrency(spread)}</span>
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {bestRating > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {bestRating.toFixed(1)}
                      </span>
                    )}
                    {p.category && (
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {p.category}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
