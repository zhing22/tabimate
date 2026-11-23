// Where player stats come from (core/stats.ts StatsSource). main.ts picks:
// the API on the live site, nothing in development or tests. Every failure is
// quiet: stats are a bonus and the game never waits on them.
import { STATS } from '@/config/stats';
import type { DateKey } from '@/core/types';
import type { StorageAdapter } from '@/core/storage';
import type { DayStats, RunSubmission, StatsSource } from '@/core/stats';

/** No server: runs go nowhere and there are never stats (offline, development). */
export const nullStatsSource: StatsSource = {
  submitRun: () => Promise.resolve(),
  getDayStats: () => Promise.resolve(null),
};

export interface ApiStatsOptions {
  /** The site's absolute base URL; the API is STATS.apiPath under it. */
  readonly baseUrl: string;
  readonly storage: StorageAdapter;
  /** Tests pass a fake; the source only ever asks for string URLs. */
  readonly fetch?: (url: string, init?: RequestInit) => Promise<Response>;
  readonly timeoutMs?: number;
}

/**
 * The /api/runs API. A run that fails to send is kept in storage and tried
 * once more on the next launch (retryPending), then dropped either way, so a
 * player offline for a week never piles up requests.
 */
export function createApiStatsSource(options: ApiStatsOptions): StatsSource & {
  retryPending(): Promise<void>;
} {
  const doFetch = options.fetch ?? ((url: string, init?: RequestInit) => fetch(url, init));
  const timeoutMs = options.timeoutMs ?? STATS.timeoutMs;
  const url = new URL(STATS.apiPath, options.baseUrl).href;

  const request = (input: string, init: RequestInit = {}) =>
    doFetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) });

  async function send(run: RunSubmission): Promise<boolean> {
    try {
      const response = await request(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(run),
      });
      // A 4xx means the server will never take it (an old day, say): don't retry.
      return response.ok || (response.status >= 400 && response.status < 500);
    } catch {
      return false;
    }
  }

  return {
    async submitRun(run) {
      if (!(await send(run))) options.storage.set(STATS.pendingKey, run);
    },
    async retryPending() {
      const pending = options.storage.get(STATS.pendingKey);
      if (pending === null) return;
      options.storage.remove(STATS.pendingKey); // one more try only
      if (isSubmission(pending)) await send(pending);
    },
    async getDayStats(dateKey: DateKey): Promise<DayStats | null> {
      try {
        const response = await request(`${url}?date=${dateKey}`);
        if (!response.ok) return null;
        const body = (await response.json()) as unknown;
        return isDayStats(body) ? body : null;
      } catch {
        return null;
      }
    },
  };
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Storage can hold anything (old builds, hand edits): send only a run-shaped value. */
const isSubmission = (v: unknown): v is RunSubmission =>
  isObject(v) &&
  typeof v.deviceId === 'string' &&
  typeof v.dateKey === 'string' &&
  Array.isArray(v.answers);

/** The API's answer, checked before the results trust it. */
function isDayStats(v: unknown): v is DayStats {
  if (!isObject(v) || typeof v.dateKey !== 'string' || !isObject(v.prompts)) return false;
  return Object.values(v.prompts).every(
    (p) => isObject(p) && typeof p.players === 'number' && isObject(p.answers),
  );
}
