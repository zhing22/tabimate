import { describe, expect, it } from 'vitest';
import { ACHIEVEMENT_SECTIONS, PERFECT_DAY_LEVEL } from '@/config/collection';
import { PROMPTS_PER_DAY } from '@/config/game';
import type { LevelId } from '@/config/levels';
import type { Journal } from '../journal/journal';
import { ANIMALS } from '../matcher/testFixtures';
import { emptyStats, type HistoryEntry } from '../streak';
import {
  bestDayProgress,
  journalProgress,
  scoreProgress,
  setsProgress,
  streakProgress,
  upTo,
  type ProgressContext,
} from './progress';
import { ACHIEVEMENTS } from './registry';

const day = (levels: LevelId[], base = 0): HistoryEntry => ({
  key: '2026-11-19',
  score: base,
  base,
  levels,
});
const journalOf = (...ids: string[]): Journal =>
  Object.fromEntries(
    ids.map((id) => [id, { animalId: id, firstFoundKey: 'k', timesFound: 1, bestLevel: 1 }]),
  );
const ctx = (over: Partial<ProgressContext> = {}): ProgressContext => ({
  history: [],
  journal: {},
  stats: emptyStats(),
  animals: ANIMALS,
  ...over,
});

describe('achievement progress', () => {
  it('never runs past the target, nor below zero', () => {
    expect(upTo(12, 10)).toEqual({ current: 10, target: 10 });
    expect(upTo(-1, 10)).toEqual({ current: 0, target: 10 });
  });

  it('counts the best streak and the journal against their goals', () => {
    expect(streakProgress(7)(ctx({ stats: { ...emptyStats(), bestStreak: 4 } }))).toEqual({
      current: 4,
      target: 7,
    });
    expect(journalProgress(10)(ctx({ journal: journalOf('tiger', 'penguin') }))).toEqual({
      current: 2,
      target: 10,
    });
  });

  it("measures the best day against that day's own prompt count", () => {
    const answered = bestDayProgress((level) => level > 0);
    expect(answered(ctx())).toEqual({ current: 0, target: PROMPTS_PER_DAY });
    // Days played, none met: measured against the first day's own count, not PROMPTS_PER_DAY.
    expect(answered(ctx({ history: [day([0, 0, 0])] }))).toEqual({ current: 0, target: 3 });
    // 2 of 3 beats 4 of 7: the old 3-prompt day is the closest to "every prompt".
    const history = [day([1, 1, 0]), day([1, 1, 1, 1, 0, 0, 0])];
    expect(answered(ctx({ history }))).toEqual({ current: 2, target: 3 });
    const rare = bestDayProgress((level) => level >= PERFECT_DAY_LEVEL);
    expect(rare(ctx({ history: [day([1, PERFECT_DAY_LEVEL, 0])] }))).toEqual({
      current: 1,
      target: 3,
    });
  });

  it('takes the set closest to complete', () => {
    // The fixture's penguin set has two species; one found is halfway.
    const progress = setsProgress(ctx({ journal: journalOf('emperor-penguin') }));
    expect(progress.current / progress.target).toBe(0.5);
  });

  it("measures the best day's walk against a score", () => {
    expect(scoreProgress(560)(ctx({ history: [day([1], 200), day([1], 420)] }))).toEqual({
      current: 420,
      target: 560,
    });
    expect(scoreProgress(560)(ctx())).toEqual({ current: 0, target: 560 });
  });
});

describe('the registry', () => {
  it('puts every achievement in a known section', () => {
    const sections = new Set<string>(ACHIEVEMENT_SECTIONS.map((s) => s.id));
    for (const a of ACHIEVEMENTS) expect(sections.has(a.section), a.id).toBe(true);
  });
});
