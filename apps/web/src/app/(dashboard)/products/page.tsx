'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { ArrowDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination, PaginationInfo } from '@/components/ui/pagination';
import { ProductCatalogGrid } from '@/components/products/product-catalog-grid';
import { ProductSortBar } from '@/components/products/product-sort-bar';
import { productsApi, type ProductSort } from '@/features/products/products.api';
import { marketplacesApi } from '@/features/marketplaces/marketplaces.api';
import { useSearchCapture } from '@/features/search-history';

export default function ProductsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const { capture } = useSearchCapture();

  const [q, setQ] = useState(params.get('q') ?? '');
  const [debounced, setDebounced] = useState(q);
  const [sort, setSort] = useState<ProductSort>((params.get('sort') as ProductSort) ?? 'relevance');
  const [marketplace, setMarketplace] = useState<string | undefined>(
    params.get('marketplace') ?? undefined,
  );
  const [inStockOnly, setInStockOnly] = useState(params.get('inStock') === 'true');
  const [page, setPage] = useState(parseInt(params.get('page') ?? '1', 10));
  const pageSize = 50;

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(q);
      // Capture search when debounced query is set
      if (q.trim().length >= 2) {
        capture(q);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q, capture]);

  useEffect(() => {
    const sp = new URLSearchParams();
    if (debounced) sp.set('q', debounced);
    if (sort && sort !== 'relevance') sp.set('sort', sort);
    if (marketplace) sp.set('marketplace', marketplace);
    if (inStockOnly) sp.set('inStock', 'true');
    if (page > 1) sp.set('page', page.toString());
    const next = sp.toString() ? `${pathname}?${sp.toString()}` : pathname;
    startTransition(() => router.replace(next, { scroll: false }));
  }, [debounced, sort, marketplace, inStockOnly, page, pathname, router]);

  const isSearching = debounced.trim().length >= 2;

  const search = useQuery({
    queryKey: ['products-search', debounced, sort, marketplace, inStockOnly],
    queryFn: () =>
      productsApi.search({
        q: debounced,
        sort,
        marketplace,
        inStock: inStockOnly || undefined,
      }),
    enabled: isSearching,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const catalog = useQuery({
    queryKey: ['products-catalog', sort, marketplace, inStockOnly, page, pageSize],
    queryFn: () =>
      productsApi.list({
        page,
        pageSize,
        sort: sort === 'relevance' ? 'newest' : sort,
        marketplace,
        inStock: inStockOnly || undefined,
      }),
    enabled: !isSearching,
    placeholderData: keepPreviousData,
  });

  const marketplaces = useQuery({
    queryKey: ['marketplaces'],
    queryFn: marketplacesApi.list,
    staleTime: 5 * 60_000,
  });

  const items = isSearching ? search.data?.items : catalog.data?.items;
  const total = isSearching ? (search.data?.total ?? 0) : (catalog.data?.total ?? 0);
  const isLoading = isSearching ? search.isLoading : catalog.isLoading;
  const isFetching = isSearching ? search.isFetching : catalog.isFetching;
  const error = isSearching ? search.error : catalog.error;
  const totalPages = Math.ceil(total / pageSize);

  const totalLabel = useMemo(() => {
    if (isSearching) return search.data ? `${search.data.total} matches` : '';
    return catalog.data ? `${catalog.data.total} tracked` : '';
  }, [isSearching, search.data, catalog.data]);

  const clearFilters = () => {
    setMarketplace(undefined);
    setInStockOnly(false);
    setPage(1);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Products</h1>
          <p className="text-sm text-muted-foreground">
            Search live across marketplaces, or browse what you&apos;re tracking.
          </p>
        </div>
        {totalLabel && (
          <Badge variant="outline" className="bg-card/60" aria-live="polite">
            {totalLabel}
            {isFetching && (
              <span
                className="ml-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary"
                aria-hidden="true"
              />
            )}
          </Badge>
        )}
      </div>

      <Card className="overflow-hidden">
        <CardContent className="space-y-4 p-3 sm:p-4">
          <div className="relative">
            <label htmlFor="products-search" className="sr-only">
              Search products
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="products-search"
              autoFocus
              placeholder="iPhone 15, PlayStation 5, Macbook…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-11 pl-9 pr-9 text-base sm:text-sm"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                className="ring-focus absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <ProductSortBar
            sort={sort}
            onSortChange={setSort}
            marketplace={marketplace}
            onMarketplaceChange={setMarketplace}
            marketplaces={marketplaces.data ?? []}
            inStockOnly={inStockOnly}
            onInStockChange={setInStockOnly}
          />

          {(marketplace || inStockOnly) && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              <span className="text-muted-foreground">Filters:</span>
              {marketplace && (
                <Badge variant="secondary" className="gap-1">
                  {marketplace}
                  <button
                    type="button"
                    onClick={() => setMarketplace(undefined)}
                    className="ring-focus rounded-sm"
                    aria-label={`Remove marketplace filter ${marketplace}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {inStockOnly && (
                <Badge variant="secondary" className="gap-1">
                  In stock
                  <button
                    type="button"
                    onClick={() => setInStockOnly(false)}
                    className="ring-focus rounded-sm"
                    aria-label="Remove in-stock filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 px-2 text-xs">
                Clear all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div role="region" aria-live="polite" aria-busy={isLoading}>
        {error ? (
          <EmptyState
            title="Couldn’t load products"
            description={(error as any)?.message ?? 'Please retry.'}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => (isSearching ? search.refetch() : catalog.refetch())}
              >
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
        ) : items && items.length > 0 ? (
          <ProductCatalogGrid items={items} />
        ) : isSearching ? (
          <EmptyState
            icon={<Search className="h-5 w-5" />}
            title="No products match your search"
            description="Try a different term, remove filters, or check spelling."
            action={
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<ArrowDown className="h-5 w-5" />}
            title="Your catalog is empty"
            description="Start typing above to search across marketplaces — discovered products are saved here automatically."
          />
        )}
      </div>

      {/* Pagination */}
      {!isLoading && items && items.length > 0 && totalPages > 1 && !isSearching && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <PaginationInfo
            currentPage={page}
            pageSize={pageSize}
            totalItems={total}
          />
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(newPage) => {
              setPage(newPage);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>
      )}
    </div>
  );
}
