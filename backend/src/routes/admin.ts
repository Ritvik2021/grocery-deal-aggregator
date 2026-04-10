import { Router, Request, Response } from 'express';
import { fetchAndStoreFlippDeals } from '../fetchers/flipp';
import axios from 'axios';

const router = Router();

let refreshInProgress = false;

// POST /api/admin/refresh — protected by x-admin-secret header (fire-and-forget)
router.post('/refresh', async (req: Request, res: Response) => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (refreshInProgress) {
    return res.status(409).json({ success: false, message: 'Refresh already in progress' });
  }
  refreshInProgress = true;
  console.log('[Admin] Manual refresh triggered');
  fetchAndStoreFlippDeals()
    .catch((err) => console.error('[Admin] Refresh error:', err))
    .finally(() => { refreshInProgress = false; });
  res.json({ success: true, message: 'Refresh started' });
});

// POST /api/public-refresh — fire-and-forget, returns immediately
// Used by the frontend refresh button (no auth, local use only)
router.post('/public-refresh', (_req: Request, res: Response) => {
  if (refreshInProgress) {
    return res.status(409).json({ success: false, message: 'A refresh is already running — check back in a moment' });
  }
  refreshInProgress = true;
  console.log('[Refresh] Manual refresh triggered');
  fetchAndStoreFlippDeals()
    .catch((err) => console.error('[Refresh] Error:', err instanceof Error ? err.message : String(err)))
    .finally(() => { refreshInProgress = false; });
  res.json({ success: true, message: 'Refresh started — deals will update shortly' });
});

// GET /api/admin/probe-flipp — inspect Flipp API without writing to DB
router.get('/probe-flipp', async (_req: Request, res: Response) => {
  const FLIPP_BASE = 'https://backflipp.wishabi.com/flipp';
  const postalCode = process.env.FLIPP_POSTAL_CODE || 'M5V2T6';
  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  };

  async function probe(url: string, params?: Record<string, any>): Promise<{ ok: boolean; status?: number; itemCount?: number; fields?: string[]; sample?: any[]; error?: string; raw?: string }> {
    try {
      const r = await axios.get<any>(url, { params, headers, timeout: 12000, responseType: 'text' });
      const body: string = r.data;
      if (body.trim().startsWith('<')) return { ok: false, status: r.status, error: 'HTML response' };
      const parsed = JSON.parse(body);
      const items: any[] = Array.isArray(parsed)
        ? parsed
        : (parsed.flyer_items ?? parsed.items ?? parsed.data ?? parsed.results ?? []);
      return { ok: true, status: r.status, itemCount: items.length, fields: items[0] ? Object.keys(items[0]) : [], sample: items.slice(0, 2) };
    } catch (e: any) {
      return { ok: false, status: e?.response?.status, error: e?.message ?? String(e) };
    }
  }

  try {
    // Step 1: Baseline — known-working search for Walmart
    const baseRes = await axios.get<any>(`${FLIPP_BASE}/items/search`, {
      params: { locale: 'en-ca', postal_code: postalCode, q: 'Walmart' },
      headers, timeout: 30000,
    });
    const raw = baseRes.data;
    const baseItems: any[] = Array.isArray(raw) ? raw : (raw.items ?? raw.data ?? raw.results ?? []);
    const flyerIds = [...new Set(baseItems.map((i: any) => i.flyer_id).filter(Boolean))] as number[];
    const merchantIds = [...new Set(baseItems.map((i: any) => i.merchant_id).filter(Boolean))] as number[];
    const flyerId = flyerIds[0];
    const merchantId = merchantIds[0];

    // Step 2: Test pagination on the search endpoint
    const page2 = await probe(`${FLIPP_BASE}/items/search`, { locale: 'en-ca', postal_code: postalCode, q: 'Walmart', page: 2 });
    const page2Offset = await probe(`${FLIPP_BASE}/items/search`, { locale: 'en-ca', postal_code: postalCode, q: 'Walmart', offset: 150 });
    const page2Limit = await probe(`${FLIPP_BASE}/items/search`, { locale: 'en-ca', postal_code: postalCode, q: 'Walmart', per_page: 500 });

    // Step 3: Try merchant_id-based search (no text query)
    const byMerchantId = await probe(`${FLIPP_BASE}/items/search`, { locale: 'en-ca', postal_code: postalCode, merchant_id: merchantId });
    const byMerchantIds = await probe(`${FLIPP_BASE}/items/search`, { locale: 'en-ca', postal_code: postalCode, 'merchant_ids[]': merchantId });
    const emptyQuery = await probe(`${FLIPP_BASE}/items/search`, { locale: 'en-ca', postal_code: postalCode, q: '', merchant_id: merchantId });

    // Step 4: Try flyer_id-filtered search
    const byFlyerId = await probe(`${FLIPP_BASE}/items/search`, { locale: 'en-ca', postal_code: postalCode, flyer_id: flyerId });
    const byFlyerIdArr = await probe(`${FLIPP_BASE}/items/search`, { locale: 'en-ca', postal_code: postalCode, 'flyer_ids[]': flyerId });

    // Step 5: Try direct flyer endpoints (now reporting actual status codes)
    const flyerEndpoints = await Promise.all([
      probe(`${FLIPP_BASE}/flyers/${flyerId}`),
      probe(`${FLIPP_BASE}/flyers/${flyerId}/items`),
      probe(`${FLIPP_BASE}/flyers/${flyerId}/flyer_items`),
      probe(`${FLIPP_BASE}/flyer_items`, { flyer_id: flyerId, locale: 'en-ca' }),
      probe(`${FLIPP_BASE}/flyer_items`, { 'flyer_ids[]': flyerId, locale: 'en-ca' }),
    ].map(async (p, i) => ({ label: [`/flyers/{id}`, `/flyers/{id}/items`, `/flyers/{id}/flyer_items`, `/flyer_items?flyer_id=`, `/flyer_items?flyer_ids[]=`][i], ...(await p) })));

    res.json({
      baseline: { itemCount: baseItems.length, flyerIds, merchantIds },
      pagination: { page2, page2Offset, page2Limit },
      merchantFilters: { byMerchantId, byMerchantIds, emptyQuery },
      flyerFilters: { byFlyerId, byFlyerIdArr },
      flyerEndpoints,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

export default router;
