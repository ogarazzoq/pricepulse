'use client';

import { useQuery } from '@tanstack/react-query';
import { searchHistoryApi } from '../search-history.api';

/**
 * Hook for fetching recent search queries
 * 
 * @param limit - Number of recent searches to fetch (default: 10, clamped 1-50)
 * @returns React Query result with recent searches
 * 
 * @example
 * ```tsx
 * function RecentSearchesWidget() {
 *   const { data, isLoading, error } = useRecentSearches(5);
 *   
 *   if (isLoading) return <Skeleton />;
 *   if (error || !data) return <EmptyState />;
 *   
 *   return (
 *     <ul>
 *       {data.map(search => (
 *         <li key={search.id}>{search.query}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useRecentSearches(limit: number = 10) {
  return useQuery({
    queryKey: ['searches', 'recent', limit],
    queryFn: () => searchHistoryApi.getRecent(limit),
    staleTime: 30_000, // 30 seconds
  });
}
