import { api } from '@/lib/api-client';

export interface Marketplace {
  id: string;
  slug: string;
  name: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  isActive: boolean;
  baseCurrency: string;
  providerAvailable: boolean;
  createdAt: string;
}

export const marketplacesApi = {
  list: () => api.get<Marketplace[]>('/marketplaces').then((r) => r.data),
  toggle: (id: string, isActive: boolean) =>
    api.patch<Marketplace>(`/admin/marketplaces/${id}`, { isActive }).then((r) => r.data),
};
