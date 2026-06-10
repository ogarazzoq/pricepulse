'use client';

import { useQuery } from '@tanstack/react-query';
import { savedProductsApi } from './saved-products.api';

/**
 * Hook for fetching the current user's saved products count
 * 
 * Uses React Query to fetch and cache the saved count. This query
 * is automatically invalidated when save/unsave mutations occur
 * via the useSavedProduct hook.
 * 
 * @returns React Query result with saved count data
 * 
 * @example
 * ```tsx
 * function SavedCountBadge() {
 *   const { data, isLoading, error } = useSavedCount();
 *   
 *   if (isLoading) return <Skeleton />;
 *   if (error) return null; // Silent failure
 *   
 *   const count = data?.count ?? 0;
 *   return count > 0 ? <Badge>{count > 99 ? '99+' : count}</Badge> : null;
 * }
 * ```
 */
export function useSavedCount() {
  return useQuery({
    queryKey: ['saved', 'count'],
    queryFn: () => savedProductsApi.count(),
  });
}
