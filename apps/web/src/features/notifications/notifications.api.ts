import { api } from '@/lib/api-client';

export type NotificationChannel = 'EMAIL' | 'TELEGRAM' | 'IN_APP';
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface NotificationRecord {
  id: string;
  userId: string;
  alertId?: string | null;
  channel: NotificationChannel;
  status: NotificationStatus;
  subject: string;
  body: string;
  metadata?: Record<string, unknown> | null;
  sentAt?: string | null;
  failedAt?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

export const notificationsApi = {
  list: () => api.get<NotificationRecord[]>('/notifications').then((r) => r.data),
};
