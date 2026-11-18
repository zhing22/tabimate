import { describe, expect, it } from 'vitest';
import type { LevelId } from '@/config/tiers';
import type { RoundResult } from './types';
import { dayTotal, pointsFor } from './scoring';

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

  it('applies a multiplier to the total only, rounded', () => {
    expect(dayTotal([result(5), result(2)], 2)).toBe(250);
    expect(dayTotal([result(1), result(2)], 1.5)).toBe(53); // 35 x 1.5 = 52.5
  });
});
