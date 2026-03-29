import { Router, Request, Response } from 'express';
import { fetchAndStoreFlippDeals } from '../fetchers/flipp';

const router = Router();

// POST /api/admin/refresh — manually trigger a Flipp data fetch
// Protected by x-admin-secret header
router.post('/refresh', async (req: Request, res: Response) => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    console.log('[Admin] Manual refresh triggered');
    // Fire and forget — client gets an immediate acknowledgement
    fetchAndStoreFlippDeals().catch((err) =>
      console.error('[Admin] Refresh error:', err)
    );
    res.json({ message: 'Refresh started — check server logs for progress' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to start refresh' });
  }
});

export default router;
