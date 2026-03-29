import { Router, Request, Response } from 'express';
import { pool } from '../db/client';

const router = Router();

// GET /api/deals
// Query params: store (slug), category, minSavings (%), search, limit, offset
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      store,
      category,
      minSavings,
      search,
      limit = '48',
      offset = '0',
    } = req.query as Record<string, string>;

    const conditions: string[] = ['d.valid_to >= CURRENT_DATE'];
    const params: unknown[] = [];
    let idx = 1;

    if (store) {
      conditions.push(`s.slug = $${idx++}`);
      params.push(store);
    }
    if (category) {
      conditions.push(`d.category ILIKE $${idx++}`);
      params.push(`%${category}%`);
    }
    if (minSavings) {
      conditions.push(`d.savings_pct >= $${idx++}`);
      params.push(Number(minSavings));
    }
    if (search) {
      conditions.push(
        `to_tsvector('english', d.name) @@ plainto_tsquery('english', $${idx++})`
      );
      params.push(search);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM deals d
       JOIN stores s ON s.id = d.store_id
       ${where}`,
      params
    );

    const limitNum = Math.min(Number(limit) || 48, 100);
    const offsetNum = Number(offset) || 0;
    params.push(limitNum, offsetNum);

    const result = await pool.query(
      `SELECT
         d.id, d.name, d.description, d.current_price, d.original_price,
         d.savings, d.savings_pct, d.unit_size, d.image_url, d.category,
         d.valid_from, d.valid_to, d.source, d.fetched_at,
         s.slug AS store_slug, s.name AS store_name, s.logo_url AS store_logo
       FROM deals d
       JOIN stores s ON s.id = d.store_id
       ${where}
       ORDER BY d.savings_pct DESC NULLS LAST, d.name
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    res.json({
      total: countResult.rows[0].total,
      limit: limitNum,
      offset: offsetNum,
      deals: result.rows,
    });
  } catch (err) {
    console.error('[GET /deals]', err);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

// GET /api/deals/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT
         d.*, s.slug AS store_slug, s.name AS store_name, s.logo_url AS store_logo
       FROM deals d
       JOIN stores s ON s.id = d.store_id
       WHERE d.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[GET /deals/:id]', err);
    res.status(500).json({ error: 'Failed to fetch deal' });
  }
});

export default router;
