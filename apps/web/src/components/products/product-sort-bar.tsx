'use client';

import { ArrowDown01, ArrowDown10, Check, Sparkles, Star, Clock, Store } from 'lucide-react';
import type { ProductSort } from '@/features/products/products.api';
import type { Marketplace } from '@/features/marketplaces/marketplaces.api';
import { cn } from '@/lib/utils';

const SORT_OPTIONS: { id: ProductSort; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'relevance', label: 'Relevance', icon: Sparkles },
  { id: 'cheapest', label: 'Cheapest', icon: ArrowDown01 },
  { id: 'expensive', label: 'Most expensive', icon: ArrowDown10 },
  { id: 'rating', label: 'Top rated', icon: Star },
  { id: 'newest', label: 'Newest', icon: Clock },
];

interface Props {
  sort: ProductSort;
  onSortChange: (s: ProductSort) => void;
  marketplace?: string;
  onMarketplaceChange: (m: string | undefined) => void;
  marketplaces: Marketplace[];
  inStockOnly: boolean;
  onInStockChange: (v: boolean) => void;
}

export function ProductSortBar({
  sort,
  onSortChange,
  marketplace,
  onMarketplaceChange,
  marketplaces,
  inStockOnly,
  onInStockChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Sort chips */}
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border/60 bg-muted/40 p-1">
        {SORT_OPTIONS.map((opt) => {
          const active = sort === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onSortChange(opt.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                active
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <opt.icon className="h-3.5 w-3.5" />
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {/* Marketplace selector */}
        <div className="relative">
          <Store className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={marketplace ?? ''}
            onChange={(e) => onMarketplaceChange(e.target.value || undefined)}
            className="h-9 rounded-lg border border-input bg-background/60 pl-8 pr-3 text-xs"
          >
            <option value="">All marketplaces</option>
            {marketplaces.map((m) => (
              <option key={m.id} value={m.slug}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* In-stock toggle */}
        <button
          onClick={() => onInStockChange(!inStockOnly)}
          className={cn(
            'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition',
            inStockOnly
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500'
              : 'border-input bg-background/60 text-muted-foreground hover:text-foreground',
          )}
        >
          <Check className={cn('h-3.5 w-3.5', !inStockOnly && 'opacity-30')} />
          In stock only
        </button>
      </div>
    </div>
  );
}
