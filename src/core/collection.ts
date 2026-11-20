// What a finished run adds to the player's lasting collection: its animals to
// the Field Journal, then any achievements that earns. Pure.
import { evaluate, type AchievementId, type UnlockedAchievement } from './achievements/registry';
import { addRun, type Journal } from './journal/journal';
import type { Stats } from './streak';
import type { AnimalId, AnimalLookup, BonusResult, RoundResult } from './types';
import { baseTotal, dayTotal } from './scoring';

export interface Collection {
  readonly journal: Journal;
  readonly achievements: readonly UnlockedAchievement[];
}

export const emptyCollection = (): Collection => ({ journal: {}, achievements: [] });

export interface CollectedRun {
  readonly collection: Collection;
  readonly newlyFound: readonly AnimalId[];
  readonly unlocked: readonly AchievementId[];
}

/**
 * Adds a finished run: the journal first, so achievements see its new animals.
 * `stats` already has the run recorded (streak and history).
 */
export function collectRun(
  collection: Collection,
  run: {
    readonly puzzleDate: string;
    readonly results: readonly RoundResult[];
    readonly bonusResults?: readonly BonusResult[];
  },
  stats: Stats,
  animals: AnimalLookup,
): CollectedRun {
  const { journal, newlyFound } = addRun(collection.journal, run);
  const ctx = {
    run: { ...run, base: baseTotal(run.results), score: dayTotal(run.results, run.bonusResults) },
    history: stats.history,
    journal,
    stats,
    animals,
  };
  const unlocked = evaluate(ctx, new Set(collection.achievements.map((a) => a.id)));
  const achievements = [
    ...collection.achievements,
    ...unlocked.map((id) => ({ id, unlockedKey: run.puzzleDate })),
  ];
  return { collection: { journal, achievements }, newlyFound, unlocked };
}
