import { Router, Request, Response } from 'express';
import { pool } from '../db/client';

const router = Router();

// Normalise a query param that may be a string or string[] into a string[].
function toArray(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val as string[];
  return [val as string];
}

// GET /api/deals
// Query params: stores (repeatable), l1 (repeatable), l2 (repeatable),
//               minSavings (%), search, limit, offset
router.get('/', async (req: Request, res: Response) => {
  try {
    const { minSavings, search, limit = '48', offset = '0' } = req.query as Record<string, string>;

    const stores = toArray(req.query.stores);
    const l1s    = toArray(req.query.l1);
    const l2s    = toArray(req.query.l2);

    const conditions: string[] = ['d.valid_to >= CURRENT_DATE'];
    const params: unknown[] = [];
    let idx = 1;

    if (stores.length) {
      conditions.push(`s.slug = ANY($${idx++}::text[])`);
      params.push(stores);
    }
    if (l1s.length) {
      conditions.push(`d.category = ANY($${idx++}::text[])`);
      params.push(l1s);
    }
    if (l2s.length) {
      conditions.push(`d.subcategory = ANY($${idx++}::text[])`);
      params.push(l2s);
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

    const where = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM deals d
       JOIN stores s ON s.id = d.store_id
       ${where}`,
      params
    );

    const limitNum  = Math.min(Number(limit) || 48, 100);
    const offsetNum = Number(offset) || 0;
    params.push(limitNum, offsetNum);

    const result = await pool.query(
      `SELECT
         d.id, d.name, d.description, d.current_price, d.original_price,
         d.savings, d.savings_pct, d.unit_size, d.image_url,
         d.category, d.subcategory,
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

// GET /api/deals/categories
// Returns [ { l1: string, l2s: string[] }, ... ] for currently-valid deals.
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT category AS l1, subcategory AS l2
       FROM deals
       WHERE category IS NOT NULL AND category <> ''
         AND valid_to >= CURRENT_DATE
       GROUP BY category, subcategory
       ORDER BY category, subcategory NULLS LAST`
    );

    // Group rows into { l1, l2s[] }
    const map = new Map<string, string[]>();
    for (const row of result.rows as { l1: string; l2: string | null }[]) {
      if (!map.has(row.l1)) map.set(row.l1, []);
      if (row.l2) map.get(row.l1)!.push(row.l2);
    }

    const categories = Array.from(map.entries()).map(([l1, l2s]) => ({ l1, l2s }));
    res.json(categories);
  } catch (err) {
    console.error('[GET /deals/categories]', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
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
