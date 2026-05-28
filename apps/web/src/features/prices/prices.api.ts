import { api } from '@/lib/api-client';

export type PriceRange = '7d' | '30d' | '90d' | '180d' | '365d' | 'all';

export interface PriceHistoryResponse {
  productId: string;
  range: PriceRange;
  series: Array<{
    marketplaceSlug: string;
    marketplaceName: string;
    points: Array<{ date: string; price: number }>;
  }>;
  stats: {
    current: number;
    lowest: number;
    highest: number;
    average: number;
    change30d: number;
    changePercent30d: number;
    volatility: number;
  };
}

export const pricesApi = {
  history: (productId: string, range: PriceRange = '30d') =>
    api
      .get<PriceHistoryResponse>(`/prices/${productId}/history`, { params: { range } })
      .then((r) => r.data),
};
