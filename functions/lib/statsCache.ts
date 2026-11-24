// The edge cache in front of GET /api/runs. Keyed on the checked date alone,
// so extra query parameters (?date=...&x=1) can't step around it and reach
// D1 on every request. An unchecked date skips the cache: the handler answers
// it with a 400.
import { isDateKey } from '../../src/core/date.ts';

/** The cache calls the API makes (the Workers Cache API, or a fake in tests). */
export interface StatsCache {
  match(key: Request): Promise<Response | undefined>;
  put(key: Request, response: Response): Promise<void>;
}

export async function cachedDayStats(
  url: URL,
  cache: StatsCache,
  waitUntil: (work: Promise<unknown>) => void,
  load: () => Promise<Response>,
): Promise<Response> {
  const date = url.searchParams.get('date') ?? '';
  if (!isDateKey(date)) return load();
  const key = new Request(`${url.origin}${url.pathname}?date=${date}`);
  const hit = await cache.match(key);
  if (hit) return hit;
  const response = await load();
  if (response.ok) waitUntil(cache.put(key, response.clone()));
  return response;
}
