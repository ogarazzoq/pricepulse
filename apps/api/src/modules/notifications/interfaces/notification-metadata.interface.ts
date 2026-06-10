/**
 * Metadata structure for Notification records.
 * 
 * This interface defines the shape of the `metadata` JSON field in the
 * Notification model, extending it to support email-specific tracking
 * (price drop details, deduplication) and retry management.
 * 
 * @see NotificationsService for usage in dedup guard and worker logic
 */
export interface NotificationMetadata {
  // Email-specific fields for price drop alerts
  /** The ID of the product that triggered the alert */
  productId?: string;

  /** The ID of the specific product offer that triggered the alert */
  offerId?: string;

  /** Slug identifier of the marketplace where the offer is from */
  marketplaceSlug?: string;

  /** Previous price before the drop (used for savings calculation) */
  oldPrice?: number;

  /** New price that triggered the alert */
  newPrice?: number;

  /** Current price (alias for newPrice in existing implementation) */
  currentPrice?: number;

  /** Alert threshold value that was met or exceeded */
  threshold?: number;

  /** Alert condition (e.g., "BELOW", "ABOVE") */
  condition?: string;

  /** 
   * Hash of (alertId:offerId:condition:threshold:priceRounded)
   * Used for deduplication to prevent sending duplicate emails
   * within the cooldown window
   */
  priceBucketHash?: string;

  // Status tracking fields
  /** Number of dispatch attempts made for this notification */
  retryCount?: number;

  /** Whether this notification was skipped due to deduplication */
  deduped?: boolean;

  /** Whether the email was sent in dry-run mode (SMTP not configured) */
  dryRun?: boolean;
}
