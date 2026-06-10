/**
 * Shared type definitions used across multiple features
 */

/**
 * Generic paginated response structure
 * Used for listing endpoints that support pagination
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Pagination parameters for list queries
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}
