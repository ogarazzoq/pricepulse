'use client';

import { useQuery } from '@tanstack/react-query';
import { searchHistoryApi } from '../search-history.api';

/**
 * Hook for fetching most frequently searched queries
 * 
 * @param limit - Number of top searches to fetch (default: 10, clamped 1-50)
 * @returns React Query result with top searches ordered by searchCount desc
 * 
 * @example
 * ```tsx
 * function TopSearchesWidget() {
 *   const { data, isLoading, error } = useTopSearches(5);
 *   
 *   if (isLoading) return <Skeleton />;
 *   if (error || !data) return <EmptyState />;
 *   
 *   return (
 *     <ul>
 *       {data.map(search => (
 *         <li key={search.id}>
 *           {search.query} ({search.searchCount})
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useTopSearches(limit: number = 10) {
  return useQuery({
    queryKey: ['searches', 'top', limit],
    queryFn: () => searchHistoryApi.getTop(limit),
    staleTime: 60_000, // 1 minute - top searches change less frequently
    retry: false,
  });
}
