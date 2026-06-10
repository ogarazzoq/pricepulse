import { api } from '@/lib/api-client';

export type AlertCondition = 'BELOW' | 'ABOVE' | 'PERCENT_DROP';
export type AlertStatus = 'ACTIVE' | 'PAUSED' | 'TRIGGERED' | 'ARCHIVED';
export type NotificationChannel = 'EMAIL' | 'TELEGRAM' | 'IN_APP';

export interface Alert {
  id: string;
  userId: string;
  productId: string;
  productTitle: string;
  productImageUrl?: string | null;
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

/**
 * Input DTO for updating an alert
 * All fields are optional for partial updates
 */
export interface UpdateAlertInput {
  threshold?: number;
  condition?: AlertCondition;
  channels?: NotificationChannel[];
  status?: 'ACTIVE' | 'PAUSED'; // Only these transitions are allowed
}

export const alertsApi = {
  list: () => api.get<Alert[]>('/alerts').then((r) => r.data),
  create: (input: CreateAlertInput) => api.post<Alert>('/alerts', input).then((r) => r.data),
  update: (id: string, body: UpdateAlertInput) =>
    api.patch<Alert>(`/alerts/${id}`, body).then((r) => r.data),
  archive: (id: string) => api.delete(`/alerts/${id}`).then((r) => r.data),
};
