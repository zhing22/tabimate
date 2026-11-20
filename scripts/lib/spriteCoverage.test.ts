import { describe, expect, it } from 'vitest';
import { COVERAGE } from '../../src/config/sprites';
import { ANIMALS } from '../../src/core/matcher/testFixtures';
import type { Animal } from '../../src/core/types';
import { dayWeight, spriteCoverage } from './spriteCoverage';

const TODAY = '2026-11-20';
const day = (date: string, ...ids: string[]) => ({
  date,
  prompts: [{ answers: ids.map((animalId) => ({ animalId })) }],
});
// The fixture's penguins under their own archetype; everything else 'test'.
const animals = new Map<string, Animal>(
  [...ANIMALS].map(([id, a]) => [id, id.includes('penguin') ? { ...a, archetype: 'penguin' } : a]),
);

describe('dayWeight', () => {
  it('counts today and upcoming days fully, and halves older days every half-life', () => {
    expect(dayWeight('2026-11-27', TODAY)).toBe(1);
    expect(dayWeight(TODAY, TODAY)).toBe(1);
    expect(dayWeight('2026-11-06', TODAY)).toBeCloseTo(0.5 ** (14 / COVERAGE.halfLifeDays));
  });
});

describe('spriteCoverage', () => {
  it('ranks archetypes by weighted answers, a group counted as its representative', () => {
    const rows = spriteCoverage(
      [day(TODAY, 'penguin', 'emperor-penguin', 'tiger'), day('2026-10-01', 'tiger', 'platypus')],
      animals,
      new Set(['test']),
      TODAY,
    );
    expect(rows.map((r) => [r.archetype, r.answers, r.hasSheet])).toEqual([
      ['penguin', 2, false], // weight 2 (both today): the group draws as Emperor penguin
      ['test', 3, true], // one today, two from weeks ago
    ]);
    expect(rows[0]!.animals).toEqual(['penguin', 'emperor-penguin']);
    expect(rows[1]!.weight).toBeLessThan(2);
  });

  it('skips answers whose animal is unknown', () => {
    expect(spriteCoverage([day(TODAY, 'unicorn')], animals, new Set(), TODAY)).toEqual([]);
  });
});
