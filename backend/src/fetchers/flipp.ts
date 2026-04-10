import axios from 'axios';
import { pool } from '../db/client';
import { normalizeCategory } from './normalizeCategory';

const FLIPP_BASE = 'https://backflipp.wishabi.com/flipp';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  Accept: 'application/json',
};

// Target retailers — search query used to discover their flyer IDs
const TARGET_STORES: { slug: string; name: string; query: string }[] = [
  { slug: 'walmart',                  name: 'Walmart',                  query: 'Walmart' },
  { slug: 'real-canadian-superstore', name: 'Real Canadian Superstore', query: 'Real Canadian Superstore' },
  { slug: 'no-frills',                name: 'No Frills',                query: 'No Frills' },
  { slug: 'save-on-foods',            name: 'Save-On-Foods',            query: 'Save-On-Foods' },
  { slug: 'costco',                   name: 'Costco',                   query: 'Costco' },
];

// Shape returned by /flipp/items/search — used only for flyer ID discovery
interface SearchItem {
  flyer_id?: number;
  merchant_name?: string;
  valid_from?: string;
  valid_to?: string;
}

// Shape returned by /flipp/flyers/{id} — the full-flyer endpoint
interface FlyerItem {
  id?: number;
  flyer_id?: number;
  name?: string;
  price?: string | number | null;
  discount?: string | number | null;
  cutout_image_url?: string;
  valid_from?: string;
  valid_to?: string;
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

async function upsertDeals(flyerId: number, storeId: number, items: FlyerItem[]) {
  let inserted = 0;
  for (const item of items) {
    const externalId = item.id != null ? String(item.id) : null;
    if (!externalId || !item.name?.trim()) continue;

    const currentPrice = item.price != null ? parseFloat(String(item.price)) : null;
    const imageUrl = item.cutout_image_url ?? null;
    const validFrom = item.valid_from ?? null;
    const validTo = item.valid_to ?? null;

    const { category, subcategory } = normalizeCategory(item.name);

    try {
      await pool.query(
        `INSERT INTO deals
           (flyer_id, store_id, external_id, name,
            current_price, original_price, savings, savings_pct,
            image_url, category, subcategory, valid_from, valid_to, source)
         VALUES ($1,$2,$3,$4,$5,NULL,NULL,NULL,$6,$7,$8,$9,$10,'flipp')
         ON CONFLICT (store_id, external_id, valid_from) DO UPDATE SET
           name           = EXCLUDED.name,
           current_price  = EXCLUDED.current_price,
           image_url      = EXCLUDED.image_url,
           category       = EXCLUDED.category,
           subcategory    = EXCLUDED.subcategory,
           fetched_at     = NOW()`,
        [flyerId, storeId, externalId, item.name.trim(), currentPrice, imageUrl, category, subcategory, validFrom, validTo]
      );
      inserted++;
    } catch {
      // Skip individual item errors
    }
  }
  return inserted;
}

async function discoverFlyerIds(store: { query: string; name: string }, postalCode: string): Promise<number[]> {
  try {
    const res = await axios.get<unknown>(
      `${FLIPP_BASE}/items/search`,
      {
        params: { locale: 'en-ca', postal_code: postalCode, q: store.query },
        headers: HEADERS,
        timeout: 30_000,
      }
    );
    const raw = res.data;
    const items: SearchItem[] = Array.isArray(raw)
      ? raw
      : ((raw as any)?.items ?? (raw as any)?.data ?? (raw as any)?.results ?? []);

    const now = new Date();
    const storeNameLower = store.name.toLowerCase();

    const ids = [...new Set(
      items
        .filter((i) => {
          // Only keep items from the target merchant
          const merchant = (i.merchant_name ?? '').toLowerCase();
          if (!merchant.includes(storeNameLower) && !storeNameLower.includes(merchant)) return false;
          // Only keep currently valid flyers
          if (i.valid_to && new Date(i.valid_to) < now) return false;
          return true;
        })
        .map((i) => i.flyer_id)
        .filter((id): id is number => !!id)
    )];
    return ids;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Flipp] Failed to discover flyer IDs for "${store.query}": ${msg}`);
    return [];
  }
}

async function fetchFlyerItems(flyerId: number): Promise<FlyerItem[]> {
  try {
    const res = await axios.get<unknown>(
      `${FLIPP_BASE}/flyers/${flyerId}`,
      { headers: HEADERS, timeout: 30_000 }
    );
    const raw = res.data;
    if (Array.isArray(raw)) return raw as FlyerItem[];
    if (raw && typeof raw === 'object') {
      const obj = raw as any;
      return obj.flyer_items ?? obj.items ?? obj.data ?? [];
    }
    return [];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Flipp] Failed to fetch items for flyer ${flyerId}: ${msg}`);
    return [];
  }
}

export async function fetchAndStoreFlippDeals(): Promise<void> {
  const postalCode = process.env.FLIPP_POSTAL_CODE || 'M5V2T6';
  console.log(`[Flipp] Starting fetch for postal code: ${postalCode}`);

  let totalDeals = 0;

  for (const store of TARGET_STORES) {
    console.log(`[Flipp] Discovering flyer IDs for: ${store.name}`);

    // Step 1: Use search to find which flyer IDs belong to this store
    const flyerIds = await discoverFlyerIds(store, postalCode);
    if (flyerIds.length === 0) {
      console.warn(`[Flipp]   → No flyer IDs found for ${store.name}, skipping`);
      continue;
    }
    console.log(`[Flipp]   → Found ${flyerIds.length} flyer(s): ${flyerIds.join(', ')}`);

    // Step 2: Fetch all items from each flyer using the full-flyer endpoint
    let allItems: FlyerItem[] = [];
    for (const flyerId of flyerIds) {
      const items = await fetchFlyerItems(flyerId);
      console.log(`[Flipp]   → Flyer ${flyerId}: ${items.length} items`);
      allItems = allItems.concat(items);
    }

    // Deduplicate across flyers by item id
    const seen = new Set<string>();
    allItems = allItems.filter((item) => {
      const key = String(item.id ?? '');
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    console.log(`[Flipp]   → ${allItems.length} unique items after dedup`);

    if (allItems.length === 0) continue;

    // Derive date range for the synthetic flyer record
    const dates = allItems.flatMap((i) => [i.valid_from, i.valid_to]).filter(Boolean) as string[];
    const validFrom = dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : null;
    const validTo   = dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null;

    const storeId = await upsertStore(store.slug, store.name);
    const dbFlyerId = await upsertSyntheticFlyer(storeId, validFrom, validTo);
    const count = await upsertDeals(dbFlyerId, storeId, allItems);

    console.log(`[Flipp]   → ${count} deals upserted for ${store.name}`);
    totalDeals += count;
  }

  console.log(`[Flipp] Done. Total deals upserted: ${totalDeals}`);
}
