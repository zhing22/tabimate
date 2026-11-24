import { describe, expect, it } from 'vitest';
import type { Journal } from '../journal/journal';
import { ANIMALS } from '../matcher/testFixtures';
import { emptyStats } from '../streak';
import { journalGoal, streakGoal } from './goals';
import type { AchievementContext } from './registry';

const ctx = (over: Partial<AchievementContext> = {}): AchievementContext => ({
  run: { puzzleDate: '2026-11-19', results: [], base: 0, score: 0 },
  history: [],
  journal: {},
  stats: emptyStats(),
  animals: ANIMALS,
  ...over,
});

describe('streakGoal', () => {
  const goal = streakGoal(7);

  it('is a streaks achievement named for its length', () => {
    expect(goal).toMatchObject({ id: 'streak-7', name: '7-day streak', section: 'streaks' });
  });

  it('unlocks at the best streak, and counts towards it', () => {
    const at = (bestStreak: number) => ctx({ stats: { ...emptyStats(), bestStreak } });
    expect(goal.check(at(6))).toBe(false);
    expect(goal.check(at(7))).toBe(true);
    expect(goal.progress?.(at(6))).toEqual({ current: 6, target: 7 });
  });
});

describe('journalGoal', () => {
  const goal = journalGoal(2);
  const journal = (n: number): Journal =>
    Object.fromEntries(
      ['tiger', 'penguin']
        .slice(0, n)
        .map((id) => [id, { animalId: id, firstFoundKey: 'k', timesFound: 1, bestLevel: 1 }]),
    );

  it('is a collection achievement named for its size', () => {
    expect(goal).toMatchObject({ id: 'journal-2', name: '2 animals', section: 'collection' });
  });

  it('unlocks at the journal size, and counts towards it', () => {
    expect(goal.check(ctx({ journal: journal(1) }))).toBe(false);
    expect(goal.check(ctx({ journal: journal(2) }))).toBe(true);
    expect(goal.progress?.(ctx({ journal: journal(1) }))).toEqual({ current: 1, target: 2 });
  });
});
