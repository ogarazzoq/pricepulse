'use client';

import { ArrowDown01, ArrowDown10, Check, Sparkles, Star, Clock, Store } from 'lucide-react';
import type { ProductSort } from '@/features/products/products.api';
import type { Marketplace } from '@/features/marketplaces/marketplaces.api';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select-custom';

const SORT_OPTIONS: {
  id: ProductSort;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'relevance', label: 'Relevance', shortLabel: 'Relevant', icon: Sparkles },
  { id: 'cheapest', label: 'Cheapest', shortLabel: 'Cheapest', icon: ArrowDown01 },
  { id: 'expensive', label: 'Most expensive', shortLabel: 'Highest', icon: ArrowDown10 },
  { id: 'rating', label: 'Top rated', shortLabel: 'Rated', icon: Star },
  { id: 'newest', label: 'Newest', shortLabel: 'Newest', icon: Clock },
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
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:flex-wrap">
      {/* Sort chips — horizontally scrollable on mobile */}
      <div
        className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:overflow-visible lg:rounded-lg lg:border lg:border-border/60 lg:bg-muted/40 lg:p-1"
        role="tablist"
        aria-label="Sort products"
      >
        {SORT_OPTIONS.map((opt) => {
          const active = sort === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSortChange(opt.id)}
              className={cn(
                'ring-focus inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors',
                active
                  ? 'bg-card text-foreground shadow-sm border border-border lg:border-transparent'
                  : 'text-muted-foreground hover:text-foreground border border-transparent',
              )}
            >
              <opt.icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{opt.label}</span>
              <span className="sm:hidden">{opt.shortLabel}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
        <Select
          value={marketplace ?? 'all'}
          onValueChange={(value) => onMarketplaceChange(value === 'all' ? undefined : value)}
        >
          <SelectTrigger
            className="w-[180px] h-9 text-xs"
            icon={<Store className="h-3.5 w-3.5" />}
          >
            <SelectValue placeholder="All marketplaces" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" icon={<Store className="h-3.5 w-3.5" />}>
              All marketplaces
            </SelectItem>
            {marketplaces.map((m) => (
              <SelectItem key={m.id} value={m.slug}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button
          type="button"
          onClick={() => onInStockChange(!inStockOnly)}
          aria-pressed={inStockOnly}
          className={cn(
            'ring-focus inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition',
            inStockOnly
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500'
              : 'border-input bg-background/60 text-muted-foreground hover:text-foreground',
          )}
        >
          <Check className={cn('h-3.5 w-3.5', !inStockOnly && 'opacity-30')} aria-hidden="true" />
          In stock
        </button>
      </div>
    </div>
  );
}
