'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { HeartButton } from '@/components/products/heart-button';
import { formatCurrency } from '@/lib/utils';
import { savedProductsApi } from '@/features/saved-products/saved-products.api';
import type { SavedProduct } from '@/features/saved-products/saved-products.types';

export default function SavedProductsPage() {
  const [page, setPage] = useState(1);
  const pageSize = 24;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['saved', 'list', page, pageSize],
    queryFn: () => savedProductsApi.list(page, pageSize),
    staleTime: 30_000,
  });

  const items = data?.items ?? [];
  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Saved Products</h1>
          <p className="text-sm text-muted-foreground">
            Products you&apos;ve marked for quick access and price tracking.
          </p>
        </div>
        {data && (
          <Badge variant="outline" className="bg-card/60">
            {data.total} saved
          </Badge>
        )}
      </div>

      <div role="region" aria-live="polite" aria-busy={isLoading}>
        {error ? (
          <EmptyState
            title="Couldn't load saved products"
            description={(error as any)?.message ?? 'Please retry.'}
            action={
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            }
          />
        ) : isLoading ? (
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] w-full" />
            ))}
          </div>
        ) : items.length > 0 ? (
          <>
            <SavedProductsGrid items={items} />
            
            {totalPages > 1 && (
              <Card className="mt-4">
                <CardContent className="flex items-center justify-between p-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <EmptyState
            icon={<Heart className="h-5 w-5" />}
            title="No saved products yet"
            description="Click the heart icon on any product to save it here for quick access and price tracking."
            action={
              <Button variant="default" size="sm" asChild>
                <Link href="/products">Browse Products</Link>
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}

function SavedProductsGrid({ items }: { items: SavedProduct[] }) {
  return (
    <ul className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((saved) => (
        <li key={saved.id}>
          <SavedProductCard saved={saved} />
        </li>
      ))}
    </ul>
  );
}

function SavedProductCard({ saved }: { saved: SavedProduct }) {
  const p = saved.product;

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
              <span className="font-medium">{p.marketplaceCount}</span>
              <span className="sr-only">marketplace offers</span>
            </Badge>
            <HeartButton productId={p.id} className="bg-background/80 backdrop-blur" />
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
          <h3 className="line-clamp-2 text-sm font-medium leading-tight">{p.title}</h3>

          <div className="mt-auto flex items-end justify-between gap-2">
            <div className="min-w-0">
              {p.lowestPrice != null ? (
                <>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    From
                  </p>
                  <p className="font-mono text-base font-semibold tabular-nums">
                    {formatCurrency(p.lowestPrice, p.currency)}
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Catalog only</p>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

