import { Router, Request, Response } from 'express';
import { fetchAndStoreFlippDeals } from '../fetchers/flipp';

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

// POST /api/public-refresh — synchronous, waits for completion and returns real result
// Used by the frontend refresh button (no auth, local use only)
router.post('/public-refresh', async (_req: Request, res: Response) => {
  if (refreshInProgress) {
    return res.status(409).json({ success: false, message: 'A refresh is already running — check back in a moment' });
  }
  refreshInProgress = true;
  console.log('[Refresh] Manual refresh triggered');
  try {
    await fetchAndStoreFlippDeals();
    res.json({ success: true, message: 'Deals refreshed successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Refresh] Error:', message);
    res.status(500).json({ success: false, error: message });
  } finally {
    refreshInProgress = false;
  }
});

export default router;
