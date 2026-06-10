/**
 * Normalizes a search query for deduplication.
 * - Trims whitespace from start and end
 * - Converts to lowercase
 * - Collapses multiple whitespace characters to a single space
 *
 * @param query - The raw search query string
 * @returns The normalized query string
 *
 * @example
 * normalizeQuery('  Hello   World  ') // returns 'hello world'
 * normalizeQuery('Test\t\nQuery') // returns 'test query'
 */
export function normalizeQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}
