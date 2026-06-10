'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Star, Store } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HeartButton } from '@/components/products/heart-button';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/features/products/products.api';

interface Props {
  items: Product[];
}

export function ProductCatalogGrid({ items }: Props) {
  return (
    <ul className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((p) => (
        <li key={p.id}>
          <ProductCard product={p} />
        </li>
      ))}
    </ul>
  );
}

function ProductCard({ product: p }: { product: Product }) {
  const offerCount = p.offers.length;
  const lowest = p.lowestPrice ?? null;
  const highest = p.highestPrice ?? null;
  const bestRating = p.offers
    .map((o) => o.rating)
    .filter((r): r is number => r != null)
    .reduce((max, r) => Math.max(max, r), 0);
  const lowestOffer = p.offers.find((o) => o.priceAvailable !== false) ?? p.offers[0];
  const discount =
    lowestOffer?.discountPercent != null && Number(lowestOffer.discountPercent) > 0
      ? Number(lowestOffer.discountPercent)
      : null;

  return (
    <Link
      href={`/products/${p.id}`}
      className="ring-focus group block h-full rounded-xl"
      aria-label={`View details for ${p.title}`}
    >
      <Card className="flex h-full flex-col overflow-hidden transition hover:border-primary/40 hover:shadow-[0_8px_28px_-12px_hsl(var(--primary)/0.4)]">
        <div className="relative aspect-[4/3] bg-muted/30">
          {p.imageUrl && (
            <Image
              src={p.imageUrl}
              alt={p.title}
              fill
              loading="lazy"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-contain p-4 transition group-hover:scale-105"
            />
          )}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
            <Badge variant="outline" className="bg-background/80 backdrop-blur">
              <Store className="h-3 w-3" aria-hidden="true" />
              <span className="font-medium">{offerCount}</span>
              <span className="sr-only">marketplace offers</span>
            </Badge>
            <div className="flex items-center gap-1">
              {discount !== null && <Badge variant="success">−{discount.toFixed(0)}%</Badge>}
              <HeartButton productId={p.id} className="bg-background/80 backdrop-blur" />
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
          <h3 className="line-clamp-2 text-sm font-medium leading-tight">{p.title}</h3>

          <div className="mt-auto flex items-end justify-between gap-2">
            <div className="min-w-0">
              {lowest != null ? (
                <>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    From
                  </p>
                  <p className="font-mono text-base font-semibold tabular-nums">
                    {formatCurrency(lowest, lowestOffer?.currency || 'USD')}
                  </p>
                  {highest != null && highest > lowest && (
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      up to{' '}
                      <span className="text-foreground/80">
                        {formatCurrency(highest, lowestOffer?.currency || 'USD')}
                      </span>
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Catalog only</p>
              )}
            </div>

            <div className="flex flex-col items-end gap-1">
              {bestRating > 0 && (
                <span
                  className="inline-flex items-center gap-1 text-xs tabular-nums"
                  aria-label={`Rating ${bestRating.toFixed(1)} out of 5`}
                >
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
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
        </div>
      </Card>
    </Link>
  );
}
