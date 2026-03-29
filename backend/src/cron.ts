import cron from 'node-cron';
import { fetchAndStoreFlippDeals } from './fetchers/flipp';

// Run every Thursday at 8:00 AM (Flipp updates weekly Thursday–Friday)
// Cron format: second(optional) minute hour day-of-month month day-of-week
const SCHEDULE = '0 8 * * 4'; // 4 = Thursday

export function startCronJobs() {
  cron.schedule(SCHEDULE, async () => {
    console.log('[Cron] Weekly Flipp fetch triggered (Thursday 8AM)');
    try {
      await fetchAndStoreFlippDeals();
    } catch (err) {
      console.error('[Cron] Fetch failed:', err);
    }
  });

  console.log('[Cron] Weekly Flipp fetch scheduled — every Thursday at 8:00 AM');
}
