import type { TierId } from '@/config/tiers';
import { shiftKey } from './date';
import { totalScore } from './journey';
import type { DateKey, RunState } from './types';

export interface HistoryEntry {
  readonly key: DateKey;
  readonly score: number;
  readonly tiers: readonly TierId[];
}

export interface Stats {
  /** Days in a row, ending on lastPlayedKey. See currentStreak for today's view. */
  readonly streak: number;
  readonly bestStreak: number;
  readonly lastPlayedKey: DateKey | null;
  /** One entry per finished day, oldest first. */
  readonly history: readonly HistoryEntry[];
}

export const emptyStats = (): Stats => ({
  streak: 0,
  bestStreak: 0,
  lastPlayedKey: null,
  history: [],
});

/** The history entry for a finished run. */
export const historyEntry = (state: RunState): HistoryEntry => ({
  key: state.puzzleDate,
  score: totalScore(state.results),
  tiers: state.results.map((result) => result.match.tier),
});

/**
 * Adds a finished day. The streak grows if the last day played was the day
 * before, otherwise it starts again at 1. A day already recorded is ignored,
 * so a finish announced twice (e.g. after a reload) never counts twice.
 */
export function recordRun(stats: Stats, entry: HistoryEntry): Stats {
  if (stats.history.some((h) => h.key === entry.key)) return stats;
  const history = [...stats.history, entry].sort((a, b) => (a.key < b.key ? -1 : 1));
  // Only a newer day moves the streak; an older one (a future archive mode) is just history.
  if (stats.lastPlayedKey !== null && entry.key < stats.lastPlayedKey) return { ...stats, history };
  const streak = stats.lastPlayedKey === shiftKey(entry.key, -1) ? stats.streak + 1 : 1;
  return {
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
    lastPlayedKey: entry.key,
    history,
  };
}

/**
 * The streak as it stands on `todayKey`. It survives while today's puzzle can
 * still extend it (last played today or yesterday) and is 0 once a day is missed.
 */
export function currentStreak(stats: Stats, todayKey: DateKey): number {
  const last = stats.lastPlayedKey;
  const alive = last !== null && (last === todayKey || last === shiftKey(todayKey, -1));
  return alive ? stats.streak : 0;
}
