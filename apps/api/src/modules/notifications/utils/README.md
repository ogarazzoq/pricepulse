# Notification Utilities

## Price Bucket Hash

The `computePriceBucketHash` utility provides deterministic hashing for price alert deduplication.

### Purpose

When a price alert is triggered, we want to prevent sending duplicate emails within a cooldown window (default 24 hours). However, we don't want to prevent emails for every tiny price fluctuation. The price bucket hash solves this by:

1. **Rounding prices to 2 decimals** - Small price changes (e.g., $99.99 → $99.98) are bucketed together
2. **Including all relevant factors** - The hash combines alert ID, offer ID, condition, threshold, and rounded price
3. **Providing deterministic output** - Same inputs always produce the same hash

### Usage

```typescript
import { computePriceBucketHash } from './utils';

// When evaluating an alert and preparing notification metadata
const hash = computePriceBucketHash(
  alertId,      // The alert that triggered
  offerId,      // The specific offer that met the condition
  condition,    // 'BELOW', 'ABOVE', etc.
  threshold,    // The threshold value from the alert
  currentPrice  // The current price that triggered the alert
);

// Store this hash in notification metadata
const metadata: NotificationMetadata = {
  priceBucketHash: hash,
  offerId,
  // ... other fields
};
```

### Integration Points

This utility is used in two places:

1. **Alert Evaluation** (when creating notifications)
   - Called in the alert-evaluate worker when an alert triggers
   - The hash is stored in the `Notification.metadata.priceBucketHash` field

2. **Deduplication Check** (before sending emails)
   - Called in `NotificationsService.isDuplicate()`
   - Queries for existing notifications with the same hash within the cooldown window

### Examples

```typescript
// Example 1: Basic usage
const hash1 = computePriceBucketHash(
  'alert-123',
  'offer-456',
  'BELOW',
  99.99,
  85.50
);
// Returns: "33ceb479e92329a4" (16 hex characters)

// Example 2: Price bucketing - both produce the same hash
const hash2 = computePriceBucketHash('alert-123', 'offer-456', 'BELOW', 99.99, 85.501);
const hash3 = computePriceBucketHash('alert-123', 'offer-456', 'BELOW', 99.99, 85.504);
// hash2 === hash3 (both round to 85.50)

// Example 3: Different buckets
const hash4 = computePriceBucketHash('alert-123', 'offer-456', 'BELOW', 99.99, 85.50);
const hash5 = computePriceBucketHash('alert-123', 'offer-456', 'BELOW', 99.99, 85.51);
// hash4 !== hash5 (different price buckets)

// Example 4: Different alerts
const hash6 = computePriceBucketHash('alert-123', 'offer-456', 'BELOW', 99.99, 85.50);
const hash7 = computePriceBucketHash('alert-999', 'offer-456', 'BELOW', 99.99, 85.50);
// hash6 !== hash7 (different alerts)
```

### Implementation Details

- **Algorithm**: SHA256 hash of the payload string
- **Output**: First 16 characters of the hex digest
- **Rounding**: `Math.round(price * 100) / 100` for 2-decimal precision
- **Payload format**: `alertId:offerId:condition:threshold:priceRounded`

### Testing

The utility has comprehensive unit tests covering:
- Hash format validation (16 hex characters)
- Determinism (same inputs → same hash)
- Price bucketing (similar prices → same hash)
- Uniqueness (different inputs → different hashes)
- Edge cases (zero, negative, very large prices)
- Rounding boundaries

Run verification:
```bash
npx tsx src/modules/notifications/utils/verify-hash.ts
```

### Requirements

Implements requirements from PricePulse Engagement Suite:
- **Requirement 16.2**: Price Bucket Hash definition
- **Requirement 16.3**: Deduplication within cooldown window
- **Requirement 16.4**: At most one email per (alertId, offerId, price-bucket) per cooldown

### See Also

- `NotificationMetadata` interface - Defines the metadata structure
- `NotificationsService.isDuplicate()` - Uses this hash for deduplication
- Alert-evaluate worker - Creates notifications with computed hashes
- Notification-dispatch worker - Checks for duplicates before sending
