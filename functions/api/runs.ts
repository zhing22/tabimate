// Cloudflare Pages Function for /api/runs: wires the handlers (functions/lib)
// to the D1 binding (DB), the site's static puzzle files (ASSETS) and the
// edge cache. The game works without it: the client treats every failure as
// "no stats".
import { getDayStats, postRun, type RunsDeps } from '../lib/handlers.ts';

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
  };
}

export const onRequestPost: PagesFunction<Env> = ({ request, env }) =>
  postRun(request, depsFor(request, env));

/** Served from the edge cache for STATS.cacheSeconds; the handler sets the lifetime. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  const cache = caches.default;
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await getDayStats(new URL(request.url), depsFor(request, env));
  if (response.ok) waitUntil(cache.put(request, response.clone()));
  return response;
};
