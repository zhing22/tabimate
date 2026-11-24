// What the Achievements page shows: every achievement in its section, with
// its unlock date or (while locked) how far along the player is. Built from
// the saved collection and stats; pure.
import { ACHIEVEMENT_SECTIONS } from '@/config/collection';
import {
  ACHIEVEMENTS,
  type Achievement,
  type Progress,
  type ProgressContext,
} from '@/core/achievements/registry';
import type { Collection } from '@/core/collection';

export interface BadgeLine {
  readonly achievement: Achievement;
  /** The puzzle that unlocked it, or null while locked. */
  readonly unlockedKey: string | null;
  /** While locked, for a count-based one: how far along (the progress bar). */
  readonly progress: Progress | null;
}

export interface BadgeSection {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly lines: readonly BadgeLine[];
}

/** The sections in config order, each with its achievements in registry order; empty ones left out. */
export function badgeSections(
  collection: Collection,
  record: Omit<ProgressContext, 'journal'>,
): BadgeSection[] {
  const unlocked = new Map(collection.achievements.map((a) => [a.id, a.unlockedKey]));
  const ctx: ProgressContext = { ...record, journal: collection.journal };
  const line = (achievement: Achievement): BadgeLine => {
    const unlockedKey = unlocked.get(achievement.id) ?? null;
    const progress = unlockedKey === null ? (achievement.progress?.(ctx) ?? null) : null;
    return { achievement, unlockedKey, progress };
  };
  return ACHIEVEMENT_SECTIONS.map((section) => ({
    ...section,
    lines: ACHIEVEMENTS.filter((a) => a.section === section.id).map(line),
  })).filter((section) => section.lines.length > 0);
}

/** "3 of 14 unlocked": every line on the page, across sections. */
export const unlockedCount = (sections: readonly BadgeSection[]) => {
  const lines = sections.flatMap((s) => s.lines);
  return { unlocked: lines.filter((l) => l.unlockedKey !== null).length, total: lines.length };
};
