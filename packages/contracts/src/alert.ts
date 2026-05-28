export type AlertCondition = 'BELOW' | 'ABOVE' | 'PERCENT_DROP';
export type AlertStatus = 'ACTIVE' | 'PAUSED' | 'TRIGGERED' | 'ARCHIVED';
export type NotificationChannel = 'EMAIL' | 'TELEGRAM' | 'IN_APP';

export interface Alert {
  id: string;
  userId: string;
  productId: string;
  productTitle: string;
  productImageUrl?: string | null;
  marketplaceSlug?: string | null;
  condition: AlertCondition;
  threshold: number;
  currency: string;
  channels: NotificationChannel[];
  status: AlertStatus;
  lastEvaluatedAt?: string | null;
  lastTriggeredAt?: string | null;
  createdAt: string;
}

export interface CreateAlertInput {
  productId: string;
  marketplaceSlug?: string;
  condition: AlertCondition;
  threshold: number;
  channels: NotificationChannel[];
}
