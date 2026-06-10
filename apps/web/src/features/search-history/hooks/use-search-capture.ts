'use client';

import { useMutation } from '@tanstack/react-query';
import { useRef } from 'react';
import { searchHistoryApi } from '../search-history.api';
import { normalizeQuery } from '../utils';

/**
 * Hook for capturing search queries with 5-second coalescing window.
 * 
 * Implements client-side coalescing to prevent excessive API calls
 * when users repeatedly search the same query. Only submits to API
 * once per 5 seconds per normalized query.
 * 
 * Silent failures - does not show error toasts to avoid interrupting
 * the user's search experience.
 * 
 * @returns Object with capture function
 * 
 * @example
 * ```tsx
 * const { capture } = useSearchCapture();
 * 
 * const handleSearch = (query: string) => {
 *   capture(query); // Coalesced submission
 *   // Proceed with search...
 * };
 * ```
 */
export function useSearchCapture() {
  // Track last submission time per normalized query
  const lastSubmitRef = useRef<Map<string, number>>(new Map());

  const mutation = useMutation({
    mutationFn: (query: string) => searchHistoryApi.capture(query),
    // Silent failure - no error handling
    onError: () => {
      // Intentionally silent - don't interrupt user's search experience
    },
  });

  const capture = (query: string) => {
    const trimmed = query.trim();
    
    // Validate query length (2-256 chars)
    if (trimmed.length < 2 || trimmed.length > 256) {
      return;
    }

    const normalized = normalizeQuery(trimmed);
    const now = Date.now();
    const lastSubmit = lastSubmitRef.current.get(normalized);

    // Coalescing: only submit if 5 seconds have passed since last submit
    if (lastSubmit && now - lastSubmit < 5000) {
      return;
    }

    // Update last submit time and trigger mutation
    lastSubmitRef.current.set(normalized, now);
    mutation.mutate(query);
  };

  return {
    capture,
  };
}
