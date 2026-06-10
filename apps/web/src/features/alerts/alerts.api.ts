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
  triggeredCount?: number;
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

export interface BulkAlertOperationResult {
  success: number;
  failed: number;
  total: number;
  successIds: string[];
  errors: Array<{ alertId: string; error: string }>;
}

export const alertsApi = {
  list: () => api.get<Alert[]>('/alerts').then((r) => r.data),
  create: (input: CreateAlertInput) => api.post<Alert>('/alerts', input).then((r) => r.data),
  update: (id: string, body: UpdateAlertInput) =>
    api.patch<Alert>(`/alerts/${id}`, body).then((r) => r.data),
  archive: (id: string) => api.delete(`/alerts/${id}`).then((r) => r.data),
  
  // Bulk operations
  bulkPause: (alertIds: string[]) => 
    api.post<BulkAlertOperationResult>('/alerts/bulk/pause', { alertIds }).then((r) => r.data),
  bulkResume: (alertIds: string[]) => 
    api.post<BulkAlertOperationResult>('/alerts/bulk/resume', { alertIds }).then((r) => r.data),
  bulkArchive: (alertIds: string[]) => 
    api.post<BulkAlertOperationResult>('/alerts/bulk/archive', { alertIds }).then((r) => r.data),
  bulkDelete: (alertIds: string[]) => 
    api.post<BulkAlertOperationResult>('/alerts/bulk/delete', { alertIds }).then((r) => r.data),
};
