import { describe, expect, it } from 'vitest';
import { BIOMES } from '@/config/biomes';
import type { AnswerLevel } from '@/config/levels';
import { DISTANCE_PER_POINT, PROMPTS_PER_DAY } from '@/config/game';
import { biomeFor, biomesEntered, distanceFor } from './journey';
import { dayTotal } from './scoring';
import type { RoundResult } from './types';

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
    [199, 'forest'],
    [200, 'rocky-hills'],
    [300, 'rainforest'],
    [420, 'wetland'],
    [559, 'wetland'],
    [560, 'snowy-peak'],
    [700, 'snowy-peak'],
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
    [125, 300, ['rocky-hills', 'rainforest']],
    [125, 199, []],
    [60, 60, []],
  ])('%i -> %i enters %j', (from, to, ids) => {
    expect(biomesEntered(from, to).map((b) => b.id)).toEqual(ids);
  });
});

describe('a full 7-prompt day', () => {
  const run = (levels: AnswerLevel[]): RoundResult[] =>
    levels.map((level, i) => ({
      promptId: `p${i}`,
      timeMs: 1000,
      match: { level, animalId: 'x', strategy: 'exact', input: 'x' },
    }));

  /** Every biome a run enters, answer by answer, as the scene sees them. */
  const entered = (results: RoundResult[]) =>
    results.flatMap((_, i) =>
      biomesEntered(dayTotal(results.slice(0, i)), dayTotal(results.slice(0, i + 1))).map(
        (b) => b.id,
      ),
    );

  it('can reach all seven biomes', () => {
    expect(BIOMES).toHaveLength(7);
    const expert = run([5, 5, 4, 4, 4, 4, 4]); // 625
    expect(expert).toHaveLength(PROMPTS_PER_DAY);
    expect(entered(expert)).toEqual(BIOMES.slice(1).map((b) => b.id));
    expect(biomeFor(dayTotal(expert)).id).toBe('snowy-peak');
  });

  it.each<[string, AnswerLevel, string]>([
    ['all LC', 1, 'grassland'],
    ['all NT', 2, 'forest'],
    ['all VU', 3, 'rainforest'],
    ['all EN', 4, 'snowy-peak'],
  ])('%s ends in %s', (_name, level, biome) => {
    expect(biomeFor(dayTotal(run(Array.from({ length: PROMPTS_PER_DAY }, () => level)))).id).toBe(
      biome,
    );
  });
});
