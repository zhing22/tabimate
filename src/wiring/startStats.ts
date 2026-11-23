// Composition helper for main.ts: player stats. The live build talks to
// /api/runs (Cloudflare Pages Functions + D1); development and tests use the
// null source, so nothing is sent from a dev machine (VITE_STATS=api opts a
// dev server in; npm run dev:api serves a production build). Nothing here can
// hold the game up.
import { submissionFor, type DayStats } from '@/core/stats';
import type { StorageAdapter } from '@/core/storage';
import type { DateKey, Puzzle, RoundResult } from '@/core/types';
import { createApiStatsSource, nullStatsSource } from '@/data/statsSource';
import { deviceId } from '@/services/deviceId';

export interface Stats {
  /** Sends a finished run (once more next launch if it fails). */
  submit(puzzle: Puzzle, results: readonly RoundResult[]): void;
  /** The day's picks, asked after any run being sent, so the player's own counts. */
  dayStats(dateKey: DateKey): Promise<DayStats | null>;
}

export function startStats(storage: StorageAdapter, baseUrl: string): Stats {
  const useApi = import.meta.env.PROD || import.meta.env['VITE_STATS'] === 'api';
  if (!useApi) {
    return {
      submit: () => {},
      dayStats: (dateKey) => nullStatsSource.getDayStats(dateKey),
    };
  }
  const api = createApiStatsSource({ baseUrl, storage });
  let sending = api.retryPending();
  return {
    submit(puzzle, results) {
      const run = submissionFor(deviceId(storage), puzzle, results);
      sending = sending.then(() => api.submitRun(run));
    },
    dayStats: (dateKey) => sending.then(() => api.getDayStats(dateKey)),
  };
}
