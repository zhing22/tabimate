// Tuneables for the Field Journal and achievements (core/journal/, core/achievements/).
import { ANSWER_LEVELS, TOP_LEVEL, type AnswerLevel } from './levels';

/** Streak lengths (days in a row) that each unlock an achievement. */
export const STREAK_GOALS = [3, 7, 30] as const;

/** Journal sizes (different animals found) that each unlock an achievement. */
export const JOURNAL_GOALS = [10, 50, 100] as const;

/** A perfect day: every prompt answered at this level or higher (NT, the second answer level). */
export const PERFECT_DAY_LEVEL: AnswerLevel = ANSWER_LEVELS[1] ?? TOP_LEVEL;

/** Achievement and journal toasts (ui/components/toast.ts). */
export const TOAST = {
  /** Each toast stays up this long; several queue one after another. */
  showMs: 3_500,
} as const;

/**
 * Streak freezes: one is earned each time the streak reaches a multiple of
 * earnEvery days, holding at most maxHeld. A single missed day spends one
 * automatically when the player comes back (core/streak.ts).
 */
export const STREAK_FREEZE = { earnEvery: 7, maxHeld: 1 } as const;

/** "Install Tabimate" shows once this many days are finished, until dismissed or installed. */
export const INSTALL_HINT = { afterDays: 3 } as const;

/**
 * The Achievements page's sections, in order; each achievement names one.
 * A section with no achievements yet (encounters, until v3 adds them) is
 * not shown.
 */
export const ACHIEVEMENT_SECTIONS = [
  { id: 'streaks', name: 'Streaks', icon: '🔥' },
  { id: 'collection', name: 'Collection', icon: '📖' },
  { id: 'scoring', name: 'Scoring', icon: '⭐' },
  { id: 'encounters', name: 'Encounters', icon: '🤝' },
  { id: 'exploration', name: 'Exploration', icon: '🧭' },
] as const;

export type AchievementSection = (typeof ACHIEVEMENT_SECTIONS)[number]['id'];
