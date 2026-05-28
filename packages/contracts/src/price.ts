export interface PriceSnapshot {
  id: string;
  productOfferId: string;
  price: number;
  currency: string;
  inStock: boolean;
  recordedAt: string;
}

export interface PriceHistoryPoint {
  date: string;
  price: number;
  marketplaceSlug: string;
}

export interface PriceTrendStats {
  lowest: number;
  highest: number;
  average: number;
  current: number;
  change30d: number;
  changePercent30d: number;
  volatility: number;
}

export interface PriceHistoryResponse {
  productId: string;
  range: '7d' | '30d' | '90d' | '180d' | '365d' | 'all';
  series: Array<{
    marketplaceSlug: string;
    marketplaceName: string;
    points: Array<{ date: string; price: number }>;
  }>;
  stats: PriceTrendStats;
}
