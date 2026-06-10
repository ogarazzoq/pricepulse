'use client';

import Link from 'next/link';
import { TrendingUp, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTopSearches } from '@/features/search-history';

/**
 * Top Searches Widget
 * 
 * Displays the 5 most frequently searched queries with search counts.
 * Clicking a search navigates to the product search page with that query.
 * 
 * Features:
 * - Skeleton loading state
 * - Empty state at stable height
 * - Search count badges
 * - Accessible navigation
 */
export function TopSearchesWidget() {
  const { data: searches, isLoading, error } = useTopSearches(5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium">Top Searches</CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : error || !searches || searches.length === 0 ? (
          <div className="flex min-h-[180px] flex-col items-center justify-center text-center">
            <Search className="h-8 w-8 text-muted-foreground/50 mb-2" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">No searches yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your top searches will appear here
            </p>
          </div>
        ) : (
          <ul className="space-y-1" role="list">
            {searches.map((search, index) => (
              <li key={search.id}>
                <Link
                  href={`/products?q=${encodeURIComponent(search.query)}`}
                  className="flex items-center justify-between rounded-lg p-2 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0 text-xs font-mono text-muted-foreground w-4">
                      {index + 1}.
                    </span>
                    <span className="truncate font-medium">{search.query}</span>
                  </div>
                  <Badge
                    variant="secondary"
                    className="ml-2 shrink-0 h-5 min-w-[24px] px-1.5 text-[10px] font-semibold"
                  >
                    {search.searchCount}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
