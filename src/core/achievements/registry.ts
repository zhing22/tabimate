// Achievements: a registry, so a new one is a new entry. Each check reads the
// whole record (history, best streak, journal), not just today's run, so an
// achievement earned before it existed unlocks on the next finished run.
import { BIOMES } from '@/config/biomes';
import {
  JOURNAL_GOALS,
  PERFECT_DAY_LEVEL,
  STREAK_GOALS,
  type AchievementSection,
} from '@/config/collection';
import { TOP_LEVEL } from '@/config/levels';
import type { JournalRun } from '../journal/journal';
import { JOURNAL_SETS, setProgress } from '../journal/sets';
import { journalGoal, streakGoal } from './goals';
import {
  bestDayProgress,
  scoreProgress,
  setsProgress,
  type Progress,
  type ProgressContext,
} from './progress';

export type { Progress, ProgressContext } from './progress';

export type AchievementId = string;

/**
 * What a check reads: the record (ProgressContext: every finished day, this
 * one included; the journal with this run's finds added; stats; animals),
 * plus the run just finished.
 */
export type AchievementContext = ProgressContext & {
  /** base is the answers' points, score the day total after the bonus. */
  readonly run: JournalRun & { readonly base: number; readonly score: number };
};

export interface Achievement {
  readonly id: AchievementId;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  /** Where it sits on the Achievements page (config/collection.ts ACHIEVEMENT_SECTIONS). */
  readonly section: AchievementSection;
  readonly check: (ctx: AchievementContext) => boolean;
  /** For a count-based one: how far along the player is (the page's progress bar). */
  readonly progress?: (ctx: ProgressContext) => Progress;
}

/** The record a save keeps: which achievement, unlocked on which puzzle. */
export interface UnlockedAchievement {
  readonly id: AchievementId;
  readonly unlockedKey: string;
}

const LAST_BIOME = BIOMES[BIOMES.length - 1]!;
// A day's levels hold one entry per prompt it had, so "every prompt" is that day's own
// count: changing PROMPTS_PER_DAY later never changes who qualified before.
const answeredAll = (levels: readonly number[]) =>
  levels.length > 0 && levels.every((level) => level > 0);

export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: 'first-jackpot',
    name: 'Jackpot!',
    description: 'Find your first top-level animal.',
    icon: '🌟',
    section: 'scoring',
    check: ({ history }) => history.some((day) => day.levels.includes(TOP_LEVEL)),
  },
  {
    id: 'first-group',
    name: 'Family name',
    description: 'Answer with a whole group, like "penguin".',
    icon: '🧺',
    section: 'collection',
    check: ({ journal, animals }) =>
      Object.keys(journal).some((id) => animals.get(id)?.kind === 'group'),
  },
  ...STREAK_GOALS.map(streakGoal),
  {
    id: 'all-answered',
    name: 'Full house',
    description: 'Answer every prompt in one day.',
    icon: '✅',
    section: 'scoring',
    check: ({ history }) => history.some((day) => answeredAll(day.levels)),
    progress: bestDayProgress((level) => level > 0),
  },
  {
    id: 'perfect-day',
    name: 'Perfect day',
    description: 'Answer every prompt in one day with rarer animals only.',
    icon: '💎',
    section: 'scoring',
    progress: bestDayProgress((level) => level >= PERFECT_DAY_LEVEL),
    check: ({ history }) =>
      history.some(
        (day) => answeredAll(day.levels) && day.levels.every((l) => l >= PERFECT_DAY_LEVEL),
      ),
  },
  ...JOURNAL_GOALS.map(journalGoal),
  {
    id: 'set-complete',
    name: 'Collector',
    description: 'Complete a journal set.',
    icon: '🏅',
    section: 'collection',
    progress: setsProgress,
    check: ({ journal, animals }) =>
      JOURNAL_SETS.some((set) => setProgress(journal, set, animals).complete),
  },
  {
    id: 'last-biome',
    name: `Reached ${LAST_BIOME.name}`,
    description: `Score ${LAST_BIOME.minScore} in a day to reach the ${LAST_BIOME.name}.`,
    icon: LAST_BIOME.emoji,
    section: 'exploration',
    progress: scoreProgress(LAST_BIOME.minScore),
    // The walk goes by the answers' points, so the base decides how far it went.
    check: ({ history }) => history.some((day) => day.base >= LAST_BIOME.minScore),
  },
];

/** The achievements newly earned: checks pass and they were not unlocked before. */
export const evaluate = (
  ctx: AchievementContext,
  unlocked: ReadonlySet<AchievementId>,
): AchievementId[] =>
  ACHIEVEMENTS.filter((a) => !unlocked.has(a.id) && a.check(ctx)).map((a) => a.id);

export const achievementById = (id: AchievementId): Achievement | undefined =>
  ACHIEVEMENTS.find((a) => a.id === id);
