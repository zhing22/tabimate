import { STREAK_FREEZE } from '@/config/collection';
import type { LevelId } from '@/config/levels';
import { shiftKey } from './date';
import { dayTotal } from './scoring';
import type { AnimalId, DateKey, RunState } from './types';

export interface HistoryEntry {
  readonly key: DateKey;
  readonly score: number;
  readonly levels: readonly LevelId[];
  /**
   * Each prompt's animal (null for a miss), in order, for the history screen's
   * team. Missing on days recorded before v4 whose full run was already gone.
   */
  readonly animalIds?: readonly (AnimalId | null)[];
}

export interface Stats {
  /** Days in a row, ending on lastPlayedKey. See streakStatus for today's view. */
  readonly streak: number;
  readonly bestStreak: number;
  readonly lastPlayedKey: DateKey | null;
  /** One entry per finished day, oldest first. */
  readonly history: readonly HistoryEntry[];
  /** Streak freezes held (0 to STREAK_FREEZE.maxHeld). */
  readonly freezes: number;
  /** Missed days a freeze covered, oldest first (the calendar marks them). */
  readonly frozenKeys: readonly DateKey[];
}

export const emptyStats = (): Stats => ({
  streak: 0,
  bestStreak: 0,
  lastPlayedKey: null,
  history: [],
  freezes: 0,
  frozenKeys: [],
});

/** The history entry for a finished run. */
export const historyEntry = (state: RunState): HistoryEntry => ({
  key: state.puzzleDate,
  score: dayTotal(state.results),
  levels: state.results.map((result) => result.match.level),
  animalIds: state.results.map((result) => result.match.animalId),
});

/** A freeze for each streak that reaches a multiple of earnEvery, up to maxHeld. */
const earned = (streak: number, freezes: number) =>
  streak % STREAK_FREEZE.earnEvery === 0 ? Math.min(STREAK_FREEZE.maxHeld, freezes + 1) : freezes;

/**
 * Adds a finished day. The streak grows if the last day played was the day
 * before. If exactly one day was missed and a freeze is held, the freeze is
 * spent and the streak carries on; otherwise it starts again at 1. A day
 * already recorded is ignored, so a finish announced twice never counts twice.
 */
export function recordRun(stats: Stats, entry: HistoryEntry): Stats {
  if (stats.history.some((h) => h.key === entry.key)) return stats;
  const history = [...stats.history, entry].sort((a, b) => (a.key < b.key ? -1 : 1));
  // Only a newer day moves the streak; an older one (a future archive mode) is just history.
  if (stats.lastPlayedKey !== null && entry.key < stats.lastPlayedKey) return { ...stats, history };
  const missed = shiftKey(entry.key, -1);
  const next = stats.lastPlayedKey === missed;
  const frozen = !next && stats.freezes > 0 && stats.lastPlayedKey === shiftKey(entry.key, -2);
  const streak = next || frozen ? stats.streak + 1 : 1;
  return {
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
    lastPlayedKey: entry.key,
    history,
    freezes: earned(streak, frozen ? stats.freezes - 1 : stats.freezes),
    frozenKeys: frozen ? [...stats.frozenKeys, missed] : stats.frozenKeys,
  };
}

export interface StreakStatus {
  /** The streak as it stands today: 0 once it is lost. */
  readonly streak: number;
  /** One day was missed and a held freeze is keeping the streak (spent on today's finish). */
  readonly savedByFreeze: boolean;
}

/**
 * The streak as it stands on `todayKey`. It survives while today's puzzle can
 * still extend it: last played today or yesterday, or the day before that with
 * a freeze held to cover the gap. Otherwise it is 0.
 */
export function streakStatus(stats: Stats, todayKey: DateKey): StreakStatus {
  const last = stats.lastPlayedKey;
  if (last === todayKey || last === shiftKey(todayKey, -1)) {
    return { streak: stats.streak, savedByFreeze: false };
  }
  const saved = last === shiftKey(todayKey, -2) && stats.freezes > 0;
  return { streak: saved ? stats.streak : 0, savedByFreeze: saved };
}

/** streakStatus's streak alone. */
export const currentStreak = (stats: Stats, todayKey: DateKey): number =>
  streakStatus(stats, todayKey).streak;
