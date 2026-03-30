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
  subcategory: string | null;
  valid_from: string | null;
  valid_to: string | null;
  source: string;
  fetched_at: string;
  store_slug: string;
  store_name: string;
  store_logo: string | null;
}

export interface CategoryGroup {
  l1: string;
  l2s: string[];
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

export const fetchCategories = (): Promise<CategoryGroup[]> =>
  apiClient.get<CategoryGroup[]>('/deals/categories').then((r) => r.data);

export interface RefreshResult {
  success: boolean;
  message?: string;
  error?: string;
}

export const triggerRefresh = (): Promise<RefreshResult> =>
  apiClient
    .post<RefreshResult>('/public-refresh', {}, { timeout: 120_000 })
    .then((r) => r.data)
    .catch((err) => ({
      success: false,
      error: err?.response?.data?.error ?? err?.response?.data?.message ?? err.message ?? 'Network error',
    }));

export const fetchDeals = (params: {
  stores?: string[];
  l1?: string[];
  l2?: string[];
  minSavings?: number;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<DealsResponse> =>
  apiClient
    .get<DealsResponse>('/deals', {
      params: {
        ...(params.stores?.length   ? { stores: params.stores }   : {}),
        ...(params.l1?.length       ? { l1:     params.l1 }       : {}),
        ...(params.l2?.length       ? { l2:     params.l2 }       : {}),
        ...(params.minSavings       ? { minSavings: params.minSavings } : {}),
        ...(params.search           ? { search: params.search }   : {}),
        limit:  params.limit  ?? 48,
        offset: params.offset ?? 0,
      },
      // Serialize arrays as repeated keys: stores=walmart&stores=no-frills
      paramsSerializer: (p) => {
        const parts: string[] = [];
        for (const [key, val] of Object.entries(p)) {
          if (Array.isArray(val)) {
            val.forEach((v) => parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`));
          } else if (val !== undefined && val !== null) {
            parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
          }
        }
        return parts.join('&');
      },
    })
    .then((r) => r.data);
