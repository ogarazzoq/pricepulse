/**
 * Normalizes a search query for deduplication.
 * 
 * Normalization rules:
 * 1. Trim leading/trailing whitespace
 * 2. Convert to lowercase
 * 3. Collapse multiple whitespace to single space
 * 
 * This ensures queries like "iPhone 15", "iphone  15", and " IPHONE 15 "
 * are treated as the same query.
 * 
 * Property: normalize(normalize(s)) = normalize(s) (idempotent)
 * 
 * @param query - The raw search query
 * @returns Normalized query string
 * 
 * @example
 * ```ts
 * normalizeQuery("  iPhone  15  ") // => "iphone 15"
 * normalizeQuery("MACBOOK PRO") // => "macbook pro"
 * ```
 */
export function normalizeQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}
