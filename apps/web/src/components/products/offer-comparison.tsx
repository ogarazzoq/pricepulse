'use client';

import { Crown, ExternalLink, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn, formatCurrency } from '@/lib/utils';
import type { ProductOffer } from '@/features/products/products.api';

interface Props {
  offers: ProductOffer[];
}

/**
 * OfferComparison — the dedicated marketplace comparison section.
 *
 * Hierarchy:
 *   1. Hero "Best deal" card (highlighted, full-width on mobile)
 *   2. Other offers in a responsive grid (1 col on mobile → 3 on lg)
 *   3. Catalog-only entries grouped at the bottom
 */
export function OfferComparison({ offers }: Props) {
  if (offers.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        No marketplace offers yet — check back after the next price sync.
      </Card>
    );
  }

  const priced = offers
    .filter((o) => o.priceAvailable !== false)
    .sort((a, b) => a.currentPrice - b.currentPrice);
  const catalogOnly = offers.filter((o) => o.priceAvailable === false);

  const best = priced[0];
  const others = priced.slice(1);

  return (
    <div className="space-y-4">
      {best && <BestDealCard offer={best} runnerUp={others[0]} />}

      {others.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Other offers
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((offer) => (
              <li key={offer.id}>
                <OtherOfferCard offer={offer} bestPrice={best.currentPrice} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {catalogOnly.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Catalog references
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {catalogOnly.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{o.marketplace.name}</p>
                  <p className="text-[11px] text-muted-foreground">No pricing data</p>
                </div>
                {o.url && (
                  <ExternalLinkButton href={o.url} label={`Open ${o.marketplace.name}`} />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function BestDealCard({ offer, runnerUp }: { offer: ProductOffer; runnerUp?: ProductOffer }) {
  const savings = runnerUp ? runnerUp.currentPrice - offer.currentPrice : 0;
  const savingsPct =
    runnerUp && runnerUp.currentPrice > 0
      ? (savings / runnerUp.currentPrice) * 100
      : 0;

  return (
    <Card className="relative overflow-hidden border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-background to-background">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/15 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
            <Crown className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500">
              Best deal
            </p>
            <p className="truncate text-base font-semibold sm:text-lg">{offer.marketplace.name}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {offer.rating != null && (
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                  {Number(offer.rating).toFixed(1)}
                  {offer.ratingCount ? ` (${offer.ratingCount})` : ''}
                </span>
              )}
              {offer.inStock ? (
                <Badge variant="success" className="h-5">
                  In stock
                  {offer.stockCount ? ` · ${offer.stockCount}` : ''}
                </Badge>
              ) : (
                <Badge variant="danger" className="h-5">Out of stock</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
          <div className="text-right">
            <p className="font-mono text-2xl font-semibold tabular-nums sm:text-3xl">
              {formatCurrency(offer.currentPrice, offer.currency)}
            </p>
            {offer.originalPrice != null && offer.originalPrice > offer.currentPrice && (
              <p className="text-xs text-muted-foreground line-through tabular-nums">
                {formatCurrency(Number(offer.originalPrice), offer.currency)}
              </p>
            )}
            {savings > 0 && (
              <p className="text-[11px] font-medium text-emerald-500">
                Save {formatCurrency(savings)} vs next best
                {savingsPct > 0 && ` (${savingsPct.toFixed(0)}%)`}
              </p>
            )}
          </div>
          {offer.url && (
            <a
              href={offer.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ring-focus inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500/90"
            >
              View deal
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}

function OtherOfferCard({
  offer,
  bestPrice,
}: {
  offer: ProductOffer;
  bestPrice: number;
}) {
  const overBestPct =
    bestPrice > 0 ? ((offer.currentPrice - bestPrice) / bestPrice) * 100 : 0;

  return (
    <Card className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{offer.marketplace.name}</p>
          {offer.rating != null && (
            <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
              {Number(offer.rating).toFixed(1)}
            </span>
          )}
        </div>
        {offer.inStock ? (
          <Badge variant="outline" className="text-[10px]">In stock</Badge>
        ) : (
          <Badge variant="danger" className="text-[10px]">Out</Badge>
        )}
      </div>

      <div>
        <p className="font-mono text-lg font-semibold tabular-nums">
          {formatCurrency(offer.currentPrice, offer.currency)}
        </p>
        <p
          className={cn(
            'text-[11px] tabular-nums',
            overBestPct > 0 ? 'text-rose-500' : 'text-muted-foreground',
          )}
        >
          {overBestPct > 0
            ? `+${overBestPct.toFixed(0)}% vs best`
            : 'Tied with best price'}
        </p>
      </div>

      {offer.url && (
        <a
          href={offer.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ring-focus inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card/40 px-3 py-2 text-xs font-medium text-foreground/90 transition hover:bg-accent"
        >
          View on {offer.marketplace.name}
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      )}
    </Card>
  );
}

function ExternalLinkButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="ring-focus inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
      aria-label={label}
    >
      <ExternalLink className="h-4 w-4" />
    </a>
  );
}
