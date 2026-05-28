import { api } from '@/lib/api-client';

export interface DashboardOverview {
  totals: {
    trackedProducts: number;
    activeAlerts: number;
    triggeredAlerts30d: number;
    averageSavingsPercent: number;
  };
  topDiscounts: Array<{
    productId: string;
    title: string;
    imageUrl?: string | null;
    marketplaceSlug: string;
    currentPrice: number;
    originalPrice: number;
    discountPercent: number;
  }>;
  recentDrops: Array<{
    productId: string;
    title: string;
    imageUrl?: string | null;
    marketplaceSlug: string;
    previousPrice: number;
    currentPrice: number;
    droppedAt: string;
  }>;
  cheapestMarketplaces: Array<{
    marketplaceSlug: string;
    marketplaceName: string;
    averagePrice: number;
    productCount: number;
  }>;
  trending: Array<{
    productId: string;
    title: string;
    imageUrl?: string | null;
    views: number;
    priceChangePercent: number;
  }>;
}

export const analyticsApi = {
  overview: () => api.get<DashboardOverview>('/analytics/overview').then((r) => r.data),
};
