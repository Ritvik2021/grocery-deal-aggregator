import axios from 'axios';
import { pool } from '../db/client';

const FLIPP_BASE = 'https://flipp.com/api/2';

// Target retailers — matched against Flipp's retailer_name field (case-insensitive)
const TARGET_STORES: { slug: string; name: string; patterns: string[] }[] = [
  {
    slug: 'walmart',
    name: 'Walmart',
    patterns: ['walmart'],
  },
  {
    slug: 'real-canadian-superstore',
    name: 'Real Canadian Superstore',
    patterns: ['real canadian superstore', 'superstore'],
  },
  {
    slug: 'no-frills',
    name: 'No Frills',
    patterns: ['no frills'],
  },
  {
    slug: 'save-on-foods',
    name: 'Save-On-Foods',
    patterns: ['save-on-foods', 'save on foods'],
  },
  {
    slug: 'costco',
    name: 'Costco',
    patterns: ['costco'],
  },
];

interface FlippPublication {
  id: number;
  retailer_name_identifier: string;
  name: string;
  valid_from: string;
  valid_to: string;
  thumb_url?: string;
}

interface FlippItem {
  id: number;
  name: string;
  description?: string;
  price?: number;
  original_price?: number;
  pre_price_text?: string;
  price_text?: string;
  save_price?: number;
  valid_from?: string;
  valid_to?: string;
  category?: string;
  large_image_url?: string;
  image_url?: string;
  unit?: string;
}

function matchStore(retailerName: string) {
  const lower = retailerName.toLowerCase();
  return TARGET_STORES.find((s) =>
    s.patterns.some((p) => lower.includes(p))
  );
}

async function upsertStore(slug: string, name: string, flippId: number) {
  const result = await pool.query(
    `INSERT INTO stores (slug, name, flipp_id, source)
     VALUES ($1, $2, $3, 'flipp')
     ON CONFLICT (slug) DO UPDATE SET flipp_id = EXCLUDED.flipp_id
     RETURNING id`,
    [slug, name, flippId]
  );
  return result.rows[0].id as number;
}

async function upsertFlyer(
  storeId: number,
  flippPubId: number,
  validFrom: string | null,
  validTo: string | null
) {
  const result = await pool.query(
    `INSERT INTO flyers (store_id, flipp_pub_id, valid_from, valid_to)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (flipp_pub_id) DO UPDATE
       SET valid_from = EXCLUDED.valid_from,
           valid_to   = EXCLUDED.valid_to,
           fetched_at = NOW()
     RETURNING id`,
    [storeId, flippPubId, validFrom || null, validTo || null]
  );
  return result.rows[0].id as number;
}

async function upsertDeals(
  flyerId: number,
  storeId: number,
  items: FlippItem[]
) {
  let inserted = 0;
  for (const item of items) {
    const savingsPct =
      item.original_price && item.price && item.original_price > 0
        ? ((item.original_price - item.price) / item.original_price) * 100
        : null;

    try {
      await pool.query(
        `INSERT INTO deals
           (flyer_id, store_id, external_id, name, description,
            current_price, original_price, savings, savings_pct,
            unit_size, image_url, category, valid_from, valid_to, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'flipp')
         ON CONFLICT (store_id, external_id, valid_from) DO UPDATE SET
           name           = EXCLUDED.name,
           current_price  = EXCLUDED.current_price,
           original_price = EXCLUDED.original_price,
           savings        = EXCLUDED.savings,
           savings_pct    = EXCLUDED.savings_pct,
           image_url      = EXCLUDED.image_url,
           fetched_at     = NOW()`,
        [
          flyerId,
          storeId,
          String(item.id),
          item.name,
          item.description || null,
          item.price ?? null,
          item.original_price ?? null,
          item.save_price ?? null,
          savingsPct !== null ? savingsPct.toFixed(2) : null,
          item.unit || null,
          item.large_image_url || item.image_url || null,
          item.category || null,
          item.valid_from || null,
          item.valid_to || null,
        ]
      );
      inserted++;
    } catch {
      // Skip individual item errors (e.g. null external_id)
    }
  }
  return inserted;
}

export async function fetchAndStoreFlippDeals(): Promise<void> {
  const postalCode = process.env.FLIPP_POSTAL_CODE || 'M5V2T6';
  console.log(`[Flipp] Starting fetch for postal code: ${postalCode}`);

  // 1. Get all active publications
  const pubsRes = await axios.get<FlippPublication[]>(
    `${FLIPP_BASE}/publications`,
    {
      params: { locale: 'en-CA', postal_code: postalCode },
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Accept: 'application/json',
      },
      timeout: 30_000,
    }
  );

  const publications = pubsRes.data;
  console.log(`[Flipp] Found ${publications.length} total publications`);

  // 2. Filter to target stores
  const matched = publications.filter((p) =>
    matchStore(p.retailer_name_identifier || p.name)
  );
  console.log(`[Flipp] Matched ${matched.length} target store publications`);

  let totalDeals = 0;

  for (const pub of matched) {
    const storeDef = matchStore(pub.retailer_name_identifier || pub.name)!;
    console.log(
      `[Flipp] Processing: ${pub.name} (pub_id=${pub.id}) → ${storeDef.name}`
    );

    // 3. Upsert store + flyer
    const storeId = await upsertStore(storeDef.slug, storeDef.name, pub.id);
    const flyerId = await upsertFlyer(
      storeId,
      pub.id,
      pub.valid_from,
      pub.valid_to
    );

    // 4. Fetch items for this publication
    try {
      const itemsRes = await axios.get<FlippItem[]>(
        `${FLIPP_BASE}/publications/${pub.id}/items`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
            Accept: 'application/json',
          },
          timeout: 30_000,
        }
      );

      const items = itemsRes.data;
      console.log(`[Flipp]   → ${items.length} items`);

      const count = await upsertDeals(flyerId, storeId, items);
      console.log(`[Flipp]   → ${count} deals upserted`);
      totalDeals += count;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Flipp] Failed to fetch items for pub ${pub.id}: ${msg}`);
    }
  }

  console.log(`[Flipp] Done. Total deals upserted: ${totalDeals}`);
}
