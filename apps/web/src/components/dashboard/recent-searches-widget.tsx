'use client';

import Link from 'next/link';
import { Clock, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRecentSearches } from '@/features/search-history';
import { formatDistanceToNow } from 'date-fns';

/**
 * Recent Searches Widget
 * 
 * Displays the 5 most recent search queries with timestamps.
 * Clicking a search navigates to the product search page with that query.
 * 
 * Features:
 * - Skeleton loading state
 * - Empty state at stable height
 * - Responsive timestamps
 * - Accessible navigation
 */
export function RecentSearchesWidget() {
  const { data: searches, isLoading, error } = useRecentSearches(5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium">Recent Searches</CardTitle>
        <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
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
              Your recent searches will appear here
            </p>
          </div>
        ) : (
          <ul className="space-y-1" role="list">
            {searches.map((search) => (
              <li key={search.id}>
                <Link
                  href={`/products?q=${encodeURIComponent(search.query)}`}
                  className="flex items-center justify-between rounded-lg p-2 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span className="truncate font-medium">{search.query}</span>
                  <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(search.lastSearchedAt), {
                      addSuffix: true,
                    })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
