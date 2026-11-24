// Cloudflare Pages Function for /api/runs: wires the handlers (functions/lib)
// to the D1 binding (DB), the site's static puzzle files (ASSETS) and the
// edge cache. The game works without it: the client treats every failure as
// "no stats".
import { getDayStats, postRun, type RunsDeps } from '../lib/handlers.ts';
import { cachedDayStats } from '../lib/statsCache.ts';

interface Env {
  readonly DB: D1Database;
  readonly ASSETS: Fetcher;
}

function depsFor(request: Request, env: Env): RunsDeps {
  return {
    db: env.DB,
    loadPuzzle: async (dateKey) => {
      const response = await env.ASSETS.fetch(
        new URL(`/data/puzzles/${dateKey}.json`, request.url),
      );
      return response.ok ? await response.json<unknown>() : null;
    },
    now: () => new Date(),
    origin: new URL(request.url).origin,
  };
}

export const onRequestPost: PagesFunction<Env> = ({ request, env }) =>
  postRun(request, depsFor(request, env));

/** Served from the edge cache (keyed on the date) for STATS.cacheSeconds. */
export const onRequestGet: PagesFunction<Env> = ({ request, env, waitUntil }) => {
  const url = new URL(request.url);
  return cachedDayStats(url, caches.default, waitUntil, () =>
    getDayStats(url, depsFor(request, env)),
  );
};
