import { Router, Request, Response } from 'express';
import { pool } from '../db/client';

const router = Router();

// GET /api/stores
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT s.id, s.slug, s.name, s.logo_url, s.source,
              COUNT(d.id)::int AS deal_count,
              MAX(d.fetched_at) AS last_updated
       FROM stores s
       LEFT JOIN deals d ON d.store_id = s.id AND d.valid_to >= CURRENT_DATE
       GROUP BY s.id
       ORDER BY s.name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[GET /stores]', err);
    res.status(500).json({ error: 'Failed to fetch stores' });
  }
});

export default router;
