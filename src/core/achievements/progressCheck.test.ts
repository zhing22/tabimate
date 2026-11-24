// A full progress bar must mean the check passes: the Achievements page says
// "Done! Unlocks with your next journey" when it is full. Each count-based
// achievement is built at its target and one short of it.
import { describe, expect, it } from 'vitest';
import { BIOMES } from '@/config/biomes';
import { PERFECT_DAY_LEVEL } from '@/config/collection';
import type { LevelId } from '@/config/levels';
import type { Journal } from '../journal/journal';
import { JOURNAL_SETS, setMembers } from '../journal/sets';
import { ANIMALS } from '../matcher/testFixtures';
import { emptyStats, type HistoryEntry } from '../streak';
import { ACHIEVEMENTS, type AchievementContext } from './registry';

/** Achievements with no progress bar: they happen once, or not at all. */
const ONE_OFF = ['first-jackpot', 'first-group'];

const ctx = (over: Partial<AchievementContext> = {}): AchievementContext => ({
  run: { puzzleDate: '2026-11-19', results: [], base: 0, score: 0 },
  history: [],
  journal: {},
  stats: emptyStats(),
  animals: ANIMALS,
  ...over,
});
const day = (levels: LevelId[], base = 0): HistoryEntry => ({
  key: '2026-11-19',
  score: base,
  base,
  levels,
});
const journalOf = (ids: readonly string[]): Journal =>
  Object.fromEntries(
    ids.map((id) => [id, { animalId: id, firstFoundKey: 'k', timesFound: 1, bestLevel: 1 }]),
  );
/** A 3-prompt day where `n` prompts meet the goal and the rest don't. */
const dayOf3 = (n: number, met: LevelId, other: LevelId) =>
  day([...Array<LevelId>(n).fill(met), ...Array<LevelId>(3 - n).fill(other)]);

const penguins = setMembers(
  JOURNAL_SETS.find((s) => s.id === 'penguins')!,
  ANIMALS,
).map((a) => a.id);
const LAST = BIOMES[BIOMES.length - 1]!;

/** For each count-based achievement: the record with `n` counted, and its target. */
const AT: Record<string, { build: (n: number) => AchievementContext; target: number }> = {
  'streak-3': { build: (n) => ctx({ stats: { ...emptyStats(), bestStreak: n } }), target: 3 },
  'streak-7': { build: (n) => ctx({ stats: { ...emptyStats(), bestStreak: n } }), target: 7 },
  'streak-30': { build: (n) => ctx({ stats: { ...emptyStats(), bestStreak: n } }), target: 30 },
  'journal-10': {
    build: (n) => ctx({ journal: journalOf(Array.from({ length: n }, (_, i) => `a${i}`)) }),
    target: 10,
  },
  'journal-50': {
    build: (n) => ctx({ journal: journalOf(Array.from({ length: n }, (_, i) => `a${i}`)) }),
    target: 50,
  },
  'journal-100': {
    build: (n) => ctx({ journal: journalOf(Array.from({ length: n }, (_, i) => `a${i}`)) }),
    target: 100,
  },
  'all-answered': { build: (n) => ctx({ history: [dayOf3(n, 1, 0)] }), target: 3 },
  'perfect-day': { build: (n) => ctx({ history: [dayOf3(n, PERFECT_DAY_LEVEL, 1)] }), target: 3 },
  'set-complete': {
    build: (n) => ctx({ journal: journalOf(penguins.slice(0, n)) }),
    target: penguins.length,
  },
  'last-biome': { build: (n) => ctx({ history: [day([1], n)] }), target: LAST.minScore },
};

describe('progress agrees with the check', () => {
  const counted = ACHIEVEMENTS.filter((a) => a.progress);

  it('lists every count-based achievement here, and every other one as a one-off', () => {
    expect(counted.map((a) => a.id).sort()).toEqual(Object.keys(AT).sort());
    const others = ACHIEVEMENTS.filter((a) => !a.progress).map((a) => a.id);
    expect(others.sort()).toEqual([...ONE_OFF].sort());
  });

  it.each(counted.map((a) => [a.id, a] as const))(
    '%s: full at its target, and only then',
    (id, a) => {
      const { build, target } = AT[id]!;
      expect(a.progress!(build(target))).toEqual({ current: target, target });
      expect(a.check(build(target))).toBe(true);
      const short = a.progress!(build(target - 1));
      expect(short.current).toBeLessThan(short.target);
      expect(a.check(build(target - 1))).toBe(false);
    },
  );
});
