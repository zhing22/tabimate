// How close a player is to a count-based achievement, from their saved
// record alone (no run needed): the Achievements page shows it as a bar.
// Pure; each is tested.
import { PROMPTS_PER_DAY } from '@/config/game';
import { journalSize, type Journal } from '../journal/journal';
import { JOURNAL_SETS, setProgress } from '../journal/sets';
import type { HistoryEntry, Stats } from '../streak';
import type { AnimalLookup } from '../types';

/** What progress reads: the record, never the run just finished. */
export interface ProgressContext {
  readonly history: readonly HistoryEntry[];
  readonly journal: Journal;
  readonly stats: Stats;
  readonly animals: AnimalLookup;
}

export interface Progress {
  readonly current: number;
  readonly target: number;
}

/** Never past the target: a bar is full, not overflowing. */
export const upTo = (current: number, target: number): Progress => ({
  current: Math.max(0, Math.min(current, target)),
  target,
});

export const streakProgress = (days: number) => (ctx: ProgressContext) =>
  upTo(ctx.stats.bestStreak, days);

export const journalProgress = (count: number) => (ctx: ProgressContext) =>
  upTo(journalSize(ctx.journal), count);

/**
 * The best single day against a goal for each of its prompts: how many of
 * that day's prompts met `counts`, out of its own prompt count (so an old
 * 3-prompt day is measured against 3). With no day closer than none, it is
 * none of the first day's own count; with no days at all, none of
 * PROMPTS_PER_DAY.
 */
export const bestDayProgress =
  (counts: (level: number) => boolean) =>
  (ctx: ProgressContext): Progress => {
    let best = upTo(0, ctx.history[0]?.levels.length || PROMPTS_PER_DAY);
    for (const day of ctx.history) {
      const met = day.levels.filter(counts).length;
      const target = day.levels.length;
      if (target > 0 && met / target > best.current / best.target) best = upTo(met, target);
    }
    return best;
  };

/** The set closest to complete: its species found, out of its size. */
export function setsProgress(ctx: ProgressContext): Progress {
  let best = upTo(0, 1);
  for (const set of JOURNAL_SETS) {
    const { found, total } = setProgress(ctx.journal, set, ctx.animals);
    if (total > 0 && found / total > best.current / best.target) best = upTo(found, total);
  }
  return best;
}

/** The best day's walk (its base score) against a score to reach. */
export const scoreProgress = (target: number) => (ctx: ProgressContext) =>
  upTo(Math.max(0, ...ctx.history.map((day) => day.base)), target);
