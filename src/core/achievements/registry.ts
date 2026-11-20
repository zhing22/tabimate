// Achievements: a registry, so a new one is a new entry. Each check reads the
// whole record (history, best streak, journal), not just today's run, so an
// achievement earned before it existed unlocks on the next finished run.
import { BIOMES } from '@/config/biomes';
import { JOURNAL_GOALS, PERFECT_DAY_LEVEL, STREAK_GOALS } from '@/config/collection';
import { TOP_LEVEL } from '@/config/levels';
import { journalSize, type Journal, type JournalRun } from '../journal/journal';
import { JOURNAL_SETS, setProgress } from '../journal/sets';
import type { HistoryEntry, Stats } from '../streak';
import type { AnimalLookup } from '../types';

export type AchievementId = string;

export interface AchievementContext {
  /** The run just finished. */
  readonly run: JournalRun & { readonly score: number };
  /** Every finished day, this one included. */
  readonly history: readonly HistoryEntry[];
  /** With this run's finds already added. */
  readonly journal: Journal;
  readonly stats: Stats;
  readonly animals: AnimalLookup;
}

export interface Achievement {
  readonly id: AchievementId;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly check: (ctx: AchievementContext) => boolean;
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

const streakGoal = (days: number): Achievement => ({
  id: `streak-${days}`,
  name: `${days}-day streak`,
  description: `Finish ${days} days in a row.`,
  icon: '🔥',
  check: ({ stats }) => stats.bestStreak >= days,
});

const journalGoal = (count: number): Achievement => ({
  id: `journal-${count}`,
  name: `${count} animals`,
  description: `Find ${count} different animals for your Field Journal.`,
  icon: '📖',
  check: ({ journal }) => journalSize(journal) >= count,
});

export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: 'first-jackpot',
    name: 'Jackpot!',
    description: 'Find your first top-level animal.',
    icon: '🌟',
    check: ({ history }) => history.some((day) => day.levels.includes(TOP_LEVEL)),
  },
  {
    id: 'first-group',
    name: 'Family name',
    description: 'Answer with a whole group, like "penguin".',
    icon: '🧺',
    check: ({ journal, animals }) =>
      Object.keys(journal).some((id) => animals.get(id)?.kind === 'group'),
  },
  ...STREAK_GOALS.map(streakGoal),
  {
    id: 'all-answered',
    name: 'Full house',
    description: 'Answer every prompt in one day.',
    icon: '✅',
    check: ({ history }) => history.some((day) => answeredAll(day.levels)),
  },
  {
    id: 'perfect-day',
    name: 'Perfect day',
    description: 'Answer every prompt in one day with rarer animals only.',
    icon: '💎',
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
    check: ({ journal, animals }) =>
      JOURNAL_SETS.some((set) => setProgress(journal, set, animals).complete),
  },
  {
    id: 'last-biome',
    name: `Reached ${LAST_BIOME.name}`,
    description: `Score ${LAST_BIOME.minScore} in a day to reach the ${LAST_BIOME.name}.`,
    icon: LAST_BIOME.emoji,
    check: ({ history }) => history.some((day) => day.score >= LAST_BIOME.minScore),
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
