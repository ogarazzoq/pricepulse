import { createHash } from 'crypto';

/**
 * Computes a deterministic hash for price bucket deduplication.
 * 
 * This hash is used to prevent sending duplicate price alert emails
 * within a cooldown window. Two evaluations that produce the same hash
 * are considered equivalent and only the first should trigger an email.
 * 
 * The hash combines:
 * - alertId: Which alert rule was triggered
 * - offerId: Which specific marketplace offer triggered it
 * - condition: The type of condition (e.g., "BELOW", "ABOVE")
 * - threshold: The threshold value set in the alert
 * - priceRounded: The current price rounded to 2 decimals
 * 
 * By rounding the price, small fluctuations (e.g., $99.99 → $99.98)
 * within the same bucket don't trigger multiple emails.
 * 
 * @param alertId - The ID of the alert being evaluated
 * @param offerId - The ID of the product offer that triggered the alert
 * @param condition - The alert condition type (e.g., "BELOW", "ABOVE")
 * @param threshold - The threshold value from the alert
 * @param currentPrice - The current price that triggered the alert
 * 
 * @returns A 16-character hexadecimal hash string
 * 
 * @example
 * ```typescript
 * const hash = computePriceBucketHash(
 *   'alert-123',
 *   'offer-456',
 *   'BELOW',
 *   99.99,
 *   85.50
 * );
 * // Returns: "a1b2c3d4e5f6g7h8" (16 hex chars)
 * ```
 */
export function computePriceBucketHash(
  alertId: string,
  offerId: string,
  condition: string,
  threshold: number,
  currentPrice: number,
): string {
  // Round price to 2 decimals to bucket similar prices together
  const priceRounded = Math.round(currentPrice * 100) / 100;
  
  // Create deterministic payload string
  const payload = `${alertId}:${offerId}:${condition}:${threshold}:${priceRounded}`;
  
  // Generate SHA256 hash and return first 16 characters
  return createHash('sha256')
    .update(payload)
    .digest('hex')
    .substring(0, 16);
}
