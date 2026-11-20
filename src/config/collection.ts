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
