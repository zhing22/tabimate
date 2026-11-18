import { describe, expect, it } from 'vitest';
import { DISTANCE_PER_POINT } from '@/config/game';
import { biomeFor, biomesEntered, distanceFor } from './journey';

// Points and day totals: see scoring.test.ts.
describe('distance', () => {
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
