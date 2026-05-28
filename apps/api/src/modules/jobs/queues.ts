/**
 * BullMQ queue identifiers — keep names stable; they are persisted in Redis.
 */
export const QUEUE = {
  PRICE_SYNC: 'price-sync',
  ALERT_EVALUATE: 'alert-evaluate',
  NOTIFICATION_DISPATCH: 'notification-dispatch',
} as const;

export type QueueName = (typeof QUEUE)[keyof typeof QUEUE];

/** Job name constants used by BullMQ within each queue. */
export const JOB = {
  PRICE_SYNC_ALL: 'sync-all',
  PRICE_SYNC_OFFER: 'sync-offer',
  EVALUATE_ALL_ALERTS: 'evaluate-all',
  DISPATCH_NOTIFICATION: 'dispatch',
} as const;
