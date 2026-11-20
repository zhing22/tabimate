import { describe, expect, it } from 'vitest';
import { BIOMES } from '@/config/biomes';
import { JOURNAL_GOALS, PERFECT_DAY_LEVEL, STREAK_GOALS } from '@/config/collection';
import { PROMPTS_PER_DAY } from '@/config/game';
import { TOP_LEVEL, type LevelId } from '@/config/levels';
import type { Journal } from '../journal/journal';
import { ANIMALS } from '../matcher/testFixtures';
import { emptyStats, type HistoryEntry } from '../streak';
import { ACHIEVEMENTS, achievementById, evaluate, type AchievementContext } from './registry';

const day = (levels: LevelId[], score = 0): HistoryEntry => ({
  key: '2026-11-19',
  score,
  base: score,
  levels,
});
const journalOf = (...ids: string[]): Journal =>
  Object.fromEntries(
    ids.map((id) => [id, { animalId: id, firstFoundKey: 'k', timesFound: 1, bestLevel: 1 }]),
  );

const ctx = (over: Partial<AchievementContext> = {}): AchievementContext => ({
  run: { puzzleDate: '2026-11-19', results: [], base: 0, score: 0 },
  history: [],
  journal: {},
  stats: emptyStats(),
  animals: ANIMALS,
  ...over,
});
const earned = (c: AchievementContext) => evaluate(c, new Set());
const full = (level: LevelId) => Array<LevelId>(PROMPTS_PER_DAY).fill(level);

describe('achievements', () => {
  it('has unique ids, each findable', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(achievementById(id)?.id).toBe(id);
  });

  it('unlocks nothing for a new player', () => {
    expect(earned(ctx())).toEqual([]);
  });

  it('first jackpot and first group', () => {
    expect(earned(ctx({ history: [day([TOP_LEVEL, 0])] }))).toEqual(['first-jackpot']);
    expect(earned(ctx({ journal: journalOf('penguin') }))).toEqual(['first-group']);
  });

  it('streaks from the best streak, one per goal reached', () => {
    const stats = { ...emptyStats(), bestStreak: STREAK_GOALS[1] };
    expect(earned(ctx({ stats }))).toEqual(STREAK_GOALS.slice(0, 2).map((d) => `streak-${d}`));
  });

  it('all answered needs every prompt of that day; a perfect day needs them rare too', () => {
    const below = (PERFECT_DAY_LEVEL - 1) as LevelId;
    expect(earned(ctx({ history: [day(full(below))] }))).toEqual(['all-answered']);
    expect(earned(ctx({ history: [day(full(PERFECT_DAY_LEVEL))] }))).toEqual([
      'all-answered',
      'perfect-day',
    ]);
    const oneMiss = [...full(PERFECT_DAY_LEVEL).slice(1), 0 as LevelId];
    expect(earned(ctx({ history: [day(oneMiss)] }))).toEqual([]);
    // An old 3-prompt day counts by its own prompts, not today's PROMPTS_PER_DAY.
    expect(earned(ctx({ history: [day([2, 2, 2])] }))).toEqual(['all-answered', 'perfect-day']);
  });

  it('journal sizes', () => {
    const ids = Array.from({ length: JOURNAL_GOALS[0] }, (_, i) => `animal-${i}`);
    expect(earned(ctx({ journal: journalOf(...ids) }))).toEqual([`journal-${JOURNAL_GOALS[0]}`]);
  });

  it('a set completed, and the last biome reached', () => {
    const penguins = journalOf('emperor-penguin', 'african-penguin');
    expect(earned(ctx({ journal: penguins }))).toEqual(['set-complete']);
    const last = BIOMES[BIOMES.length - 1]!;
    expect(earned(ctx({ history: [day([1, 0], last.minScore)] }))).toEqual(['last-biome']);
    expect(earned(ctx({ history: [day([1, 0], last.minScore - 1)] }))).toEqual([]);
  });

  it('evaluate returns only achievements not unlocked before', () => {
    const c = ctx({ history: [day([TOP_LEVEL, 0])], journal: journalOf('penguin') });
    expect(evaluate(c, new Set(['first-jackpot']))).toEqual(['first-group']);
  });
});
