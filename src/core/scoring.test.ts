import { describe, expect, it } from 'vitest';
import type { LevelId } from '@/config/levels';
import type { RoundResult } from './types';
import { BONUS } from '@/config/bonus';
import { baseTotal, dayTotal, pointsFor, runTotals } from './scoring';

const result = (level: LevelId): RoundResult =>
  level === 0
    ? { promptId: 'p', timeMs: 1, match: { level, animalId: null, strategy: null, input: '' } }
    : { promptId: 'p', timeMs: 1, match: { level, animalId: 'a', strategy: 'exact', input: 'a' } };

describe('pointsFor', () => {
  it.each([
    [0, 0],
    [1, 10],
    [2, 25],
    [3, 50],
    [4, 85],
    [5, 100],
  ] as const)('level %i is worth %i', (level, points) => {
    expect(pointsFor(level)).toBe(points);
  });
});

describe('dayTotal', () => {
  it('adds up every round', () => {
    expect(dayTotal([result(5), result(2), result(0)])).toBe(125);
    expect(dayTotal([])).toBe(0);
  });

  it('applies the bonus multiplier to the total only, rounded', () => {
    const bonus = (...correct: boolean[]) =>
      correct.map((c) => ({ answer: c, correct: c, timeMs: 1 }));
    expect(dayTotal([result(5), result(2)], bonus(true, true, false))).toBe(150); // 125 x 1.2
    expect(dayTotal([result(1), result(2)], bonus(true))).toBe(39); // 35 x 1.1 = 38.5
  });
});

describe('baseTotal and runTotals', () => {
  const answers = [result(5), result(4), result(0)]; // 100 + 85 + 0
  const bonus = (...correct: boolean[]) =>
    correct.map((c) => ({ answer: c, correct: c, timeMs: 1 }));

  it('adds the answers alone, whatever the quiz did', () => {
    expect(baseTotal(answers)).toBe(185);
    expect(baseTotal([])).toBe(0);
  });

  it('reports no quiz as ×1, the base and the score alike', () => {
    expect(runTotals({ results: answers, bonusResults: [] })).toEqual({
      results: answers,
      bonusResults: [],
      base: 185,
      multiplier: 1,
      score: 185,
    });
  });

  it('reports every answer right at the cap', () => {
    const allRight = bonus(...Array<boolean>(BONUS.questions).fill(true));
    expect(runTotals({ results: answers, bonusResults: allRight })).toMatchObject({
      base: 185,
      multiplier: BONUS.maxMultiplier,
      score: Math.round(185 * BONUS.maxMultiplier),
    });
    // More right answers than the cap allows (a longer quiz someday) still stop there.
    const many = bonus(...Array<boolean>(BONUS.questions + 2).fill(true));
    expect(runTotals({ results: answers, bonusResults: many }).multiplier).toBe(
      BONUS.maxMultiplier,
    );
  });
});
