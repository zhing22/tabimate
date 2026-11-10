import { describe, expect, it } from 'vitest';
import { DISTANCE_PER_POINT } from '@/config/game';
import type { TierId } from '@/config/tiers';
import { biomeFor, biomesEntered, distanceFor, pointsFor, totalScore } from './journey';
import type { RoundResult } from './types';

const round = (tier: TierId): RoundResult => ({
  promptId: 'p',
  timeMs: 1000,
  match:
    tier === 0
      ? { tier: 0, animalId: null, strategy: null, input: '' }
      : { tier, animalId: 'a', strategy: 'exact', input: 'a' },
});

describe('points and score', () => {
  it.each([
    [0, 0],
    [1, 10],
    [2, 25],
    [3, 50],
    [4, 85],
    [5, 100],
  ] as const)('tier %i is worth %i points', (tier, points) => {
    expect(pointsFor(round(tier))).toBe(points);
  });

  it('adds up a run', () => {
    expect(totalScore([])).toBe(0);
    expect(totalScore([round(2), round(0), round(5)])).toBe(125);
  });

  it('turns score into distance', () => {
    expect(distanceFor(0)).toBe(0);
    expect(distanceFor(125)).toBe(125 * DISTANCE_PER_POINT);
  });
});

describe('biomeFor', () => {
  it.each([
    [0, 'town'],
    [49, 'town'],
    [50, 'grassland'],
    [124, 'grassland'],
    [125, 'forest'],
    [300, 'forest'],
    [-5, 'town'],
  ])('score %i is in %s', (score, id) => {
    expect(biomeFor(score).id).toBe(id);
  });
});

describe('biomesEntered', () => {
  it.each([
    [0, 49, []],
    [0, 50, ['grassland']],
    [49, 50, ['grassland']],
    [50, 124, []],
    [124, 125, ['forest']],
    [40, 140, ['grassland', 'forest']],
    [125, 300, []],
    [60, 60, []],
  ])('%i -> %i enters %j', (from, to, ids) => {
    expect(biomesEntered(from, to).map((b) => b.id)).toEqual(ids);
  });
});
