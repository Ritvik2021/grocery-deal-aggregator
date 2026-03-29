import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// ---- Types ----

export interface Store {
  id: number;
  slug: string;
  name: string;
  logo_url: string | null;
  source: string;
  deal_count: number;
  last_updated: string | null;
}

export interface Deal {
  id: number;
  name: string;
  description: string | null;
  current_price: number | null;
  original_price: number | null;
  savings: number | null;
  savings_pct: number | null;
  unit_size: string | null;
  image_url: string | null;
  category: string | null;
  valid_from: string | null;
  valid_to: string | null;
  source: string;
  fetched_at: string;
  store_slug: string;
  store_name: string;
  store_logo: string | null;
}

export interface DealsResponse {
  total: number;
  limit: number;
  offset: number;
  deals: Deal[];
}

// ---- API helpers ----

export const fetchStores = (): Promise<Store[]> =>
  apiClient.get<Store[]>('/stores').then((r) => r.data);

export const fetchDeals = (params: {
  store?: string;
  category?: string;
  minSavings?: number;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<DealsResponse> =>
  apiClient
    .get<DealsResponse>('/deals', {
      params: Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== 0)
      ),
    })
    .then((r) => r.data);
