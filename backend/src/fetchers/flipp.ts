import axios from 'axios';
import { pool } from '../db/client';

const FLIPP_BASE = 'https://backflipp.wishabi.com/flipp';

// Target retailers — search query and display name
const TARGET_STORES: { slug: string; name: string; query: string }[] = [
  { slug: 'walmart',                  name: 'Walmart',                  query: 'Walmart' },
  { slug: 'real-canadian-superstore', name: 'Real Canadian Superstore', query: 'Real Canadian Superstore' },
  { slug: 'no-frills',                name: 'No Frills',                query: 'No Frills' },
  { slug: 'save-on-foods',            name: 'Save-On-Foods',            query: 'Save-On-Foods' },
  { slug: 'costco',                   name: 'Costco',                   query: 'Costco' },
];

// Shape returned by backflipp.wishabi.com/flipp/items/search
interface BackFlippItem {
  id?: number;
  flyer_item_id?: number;
  name?: string;
  current_price?: number;
  original_price?: number;
  pre_price_text?: string;
  post_price_text?: string;
  sale_story?: string;
  clean_image_url?: string;    // primary product image
  clipping_image_url?: string; // fallback
  _L1?: string;                // top-level category e.g. "Health & Beauty"
  _L2?: string;                // subcategory e.g. "Food Items"
  valid_from?: string;
  valid_to?: string;
  merchant_name?: string;
  flyer_id?: number;
}

interface BackFlippResponse {
  items?: BackFlippItem[];
  // fallback shapes
  data?: BackFlippItem[];
  results?: BackFlippItem[];
}

async function upsertStore(slug: string, name: string) {
  const result = await pool.query(
    `INSERT INTO stores (slug, name, source)
     VALUES ($1, $2, 'flipp')
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [slug, name]
  );
  return result.rows[0].id as number;
}

// We keep the flyers table but use a synthetic pub_id (negative store_id) so
// each store has one "current week" flyer that gets refreshed on every fetch.
async function upsertSyntheticFlyer(storeId: number, validFrom: string | null, validTo: string | null) {
  const syntheticPubId = storeId * -1;
  const result = await pool.query(
    `INSERT INTO flyers (store_id, flipp_pub_id, valid_from, valid_to)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (flipp_pub_id) DO UPDATE
       SET valid_from = EXCLUDED.valid_from,
           valid_to   = EXCLUDED.valid_to,
           fetched_at = NOW()
     RETURNING id`,
    [storeId, syntheticPubId, validFrom, validTo]
  );
  return result.rows[0].id as number;
}

async function upsertDeals(flyerId: number, storeId: number, items: BackFlippItem[]) {
  let inserted = 0;
  for (const item of items) {
    const currentPrice  = item.current_price  ?? null;
    const originalPrice = item.original_price ?? null;
    const imageUrl      = item.clean_image_url ?? item.clipping_image_url ?? null;
    const validFrom     = item.valid_from ?? null;
    const validTo       = item.valid_to   ?? null;
    const category      = item._L1 ?? null;
    const subcategory   = item._L2 ?? null;
    const externalId    = item.id != null ? String(item.id) : null;

    if (!externalId || !item.name) continue;

    const savings =
      originalPrice && currentPrice ? originalPrice - currentPrice : null;
    const savingsPct =
      originalPrice && currentPrice && originalPrice > 0
        ? ((originalPrice - currentPrice) / originalPrice) * 100
        : null;

    try {
      await pool.query(
        `INSERT INTO deals
           (flyer_id, store_id, external_id, name,
            current_price, original_price, savings, savings_pct,
            image_url, category, subcategory, valid_from, valid_to, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'flipp')
         ON CONFLICT (store_id, external_id, valid_from) DO UPDATE SET
           name           = EXCLUDED.name,
           current_price  = EXCLUDED.current_price,
           original_price = EXCLUDED.original_price,
           savings        = EXCLUDED.savings,
           savings_pct    = EXCLUDED.savings_pct,
           image_url      = EXCLUDED.image_url,
           category       = EXCLUDED.category,
           subcategory    = EXCLUDED.subcategory,
           fetched_at     = NOW()`,
        [
          flyerId,
          storeId,
          externalId,
          item.name,
          currentPrice,
          originalPrice,
          savings !== null ? savings.toFixed(2) : null,
          savingsPct !== null ? savingsPct.toFixed(2) : null,
          imageUrl,
          category,
          subcategory,
          validFrom,
          validTo,
        ]
      );
      inserted++;
    } catch {
      // Skip individual item errors
    }
  }
  return inserted;
}

export async function fetchAndStoreFlippDeals(): Promise<void> {
  const postalCode = process.env.FLIPP_POSTAL_CODE || 'M5V2T6';
  console.log(`[Flipp] Starting fetch for postal code: ${postalCode}`);

  let totalDeals = 0;

  for (const store of TARGET_STORES) {
    console.log(`[Flipp] Searching items for: ${store.name}`);

    let items: BackFlippItem[] = [];

    try {
      const res = await axios.get<BackFlippResponse>(
        `${FLIPP_BASE}/items/search`,
        {
          params: {
            locale:      'en-ca',
            postal_code: postalCode,
            q:           store.query,
          },
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
              '(KHTML, like Gecko) Chrome/124.0 Safari/537.36',
            Accept: 'application/json',
          },
          timeout: 30_000,
        }
      );

      const raw = res.data as unknown;

      if (Array.isArray(raw)) {
        items = raw as BackFlippItem[];
      } else if (raw && typeof raw === 'object') {
        const obj = raw as BackFlippResponse;
        items = obj.items ?? obj.data ?? obj.results ?? [];
        if (items.length === 0) {
          console.warn(`[Flipp] Unexpected response shape for ${store.name}. Keys:`, Object.keys(obj).join(', '));
        }
      } else if (typeof raw === 'string') {
        if ((raw as string).trimStart().startsWith('<')) {
          console.error(`[Flipp] Got HTML response for ${store.name} — API may be blocking requests`);
          continue;
        }
        try {
          const parsed = JSON.parse(raw as string);
          items = Array.isArray(parsed) ? parsed : (parsed.items ?? parsed.data ?? parsed.results ?? []);
        } catch {
          console.error(`[Flipp] Unparseable response for ${store.name}`);
          continue;
        }
      }

      console.log(`[Flipp]   → ${items.length} items found`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Flipp] Failed to fetch items for ${store.name}: ${msg}`);
      continue;
    }

    if (items.length === 0) continue;

    // Deduplicate: Flipp sometimes returns the same product multiple times
    // with different flyer_item_ids (multiple pages). Key on name+price+valid_from.
    const seen = new Set<string>();
    items = items.filter((item) => {
      const key = `${(item.name ?? '').toLowerCase()}|${item.current_price ?? ''}|${item.valid_from ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    console.log(`[Flipp]   → ${items.length} items after dedup`);

    // Derive a date range from the items for the synthetic flyer record
    const dates = items.flatMap((i) => [i.valid_from, i.valid_to]).filter(Boolean) as string[];
    const validFrom = dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : null;
    const validTo   = dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null;

    const storeId = await upsertStore(store.slug, store.name);
    const flyerId = await upsertSyntheticFlyer(storeId, validFrom, validTo);
    const count   = await upsertDeals(flyerId, storeId, items);

    console.log(`[Flipp]   → ${count} deals upserted for ${store.name}`);
    totalDeals += count;
  }

  console.log(`[Flipp] Done. Total deals upserted: ${totalDeals}`);
}
