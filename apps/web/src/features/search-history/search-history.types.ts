/**
 * Search History Feature Type Definitions
 * 
 * Types for the Search History feature that captures and deduplicates
 * user search queries with automatic per-user capping.
 */

/**
 * Search history entry representing a saved search query
 */
export interface SearchHistory {
  id: string;
  userId: string;
  query: string;
  normalizedQuery: string;
  searchCount: number;
  lastSearchedAt: string;
  createdAt: string;
}

/**
 * Input DTO for capturing a search
 */
export interface CaptureSearchInput {
  query: string;
}

/**
 * Paginated response for listing search history
 */
export interface SearchHistoryListResponse {
  items: SearchHistory[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Response for recent searches endpoint (no pagination)
 */
export interface RecentSearchesResponse {
  items: SearchHistory[];
}

/**
 * Response for top searches endpoint (no pagination)
 */
export interface TopSearchesResponse {
  items: SearchHistory[];
}
