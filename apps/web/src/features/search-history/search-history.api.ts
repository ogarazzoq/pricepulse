import { api } from '@/lib/api-client';
import type {
  SearchHistory,
  SearchHistoryListResponse,
  CaptureSearchInput,
} from './search-history.types';

/**
 * Search History API Client
 * 
 * Client functions for interacting with the search history endpoints.
 * All functions automatically include JWT token from auth store via axios interceptor.
 */
export const searchHistoryApi = {
  /**
   * Capture a search query
   * 
   * Creates a new search history entry or increments searchCount for existing normalized query.
   * Enforces per-user cap (default 100), evicting oldest entry when at cap.
   * 
   * @param query - Search query string (length 2-256)
   * @returns Search history entry with updated searchCount and lastSearchedAt
   */
  capture: (query: string) =>
    api
      .post<SearchHistory>('/searches', { query } as CaptureSearchInput)
      .then((r) => r.data),

  /**
   * List search history with pagination
   * 
   * Ordered by lastSearchedAt descending.
   * 
   * @param page - Page number (default: 1)
   * @param pageSize - Items per page (default: 20, max: 100)
   * @returns Paginated list of search history entries
   */
  list: (page: number = 1, pageSize: number = 20) =>
    api
      .get<SearchHistoryListResponse>('/searches', {
        params: { page, pageSize },
      })
      .then((r) => r.data),

  /**
   * Get recent searches
   * 
   * Ordered by lastSearchedAt descending.
   * 
   * @param limit - Number of entries to return (default: 10, clamped 1-50)
   * @returns Array of recent search history entries
   */
  getRecent: (limit: number = 10) =>
    api
      .get<SearchHistory[]>('/searches/recent', {
        params: { limit },
      })
      .then((r) => r.data),

  /**
   * Get top searches
   * 
   * Ordered by searchCount descending, then lastSearchedAt descending.
   * 
   * @param limit - Number of entries to return (default: 5, clamped 1-50)
   * @returns Array of top search history entries
   */
  getTop: (limit: number = 5) =>
    api
      .get<SearchHistory[]>('/searches/top', {
        params: { limit },
      })
      .then((r) => r.data),

  /**
   * Delete a search history entry
   * 
   * Returns 204 on success, 404 if entry doesn't exist or belongs to another user.
   * 
   * @param id - ID of the search history entry to delete
   */
  deleteOne: (id: string) =>
    api.delete<void>(`/searches/${id}`).then((r) => r.data),

  /**
   * Clear all search history for current user
   * 
   * Removes all search history entries for the authenticated user.
   * Returns 204 on success.
   */
  clearAll: () =>
    api.delete<void>('/searches').then((r) => r.data),
};

/**
 * Individual function exports for compatibility with hooks that expect them.
 * These are aliases to the searchHistoryApi methods.
 */
export const captureSearch = searchHistoryApi.capture;
export const getSearches = searchHistoryApi.list;
export const getRecentSearches = searchHistoryApi.getRecent;
export const getTopSearches = searchHistoryApi.getTop;
export const deleteSearch = searchHistoryApi.deleteOne;
export const clearAllSearches = searchHistoryApi.clearAll;
