import { describe, expect, it } from 'vitest';
import { MATCHER_CONFIG } from '@/config/game';
import { compareTies, pickBest } from './pick';
import { partial } from './strategies';
import { candidate, groupCandidate } from './testFixtures';
import type { NormalizedInput } from './types';

const input = (text: string): NormalizedInput => ({ text, promptId: 'p' });
const SAME = () => ({ score: 1, confidence: 1 });
const winner = (text: string, ...cs: ReturnType<typeof candidate>[]) =>
  pickBest(input(text), cs, SAME)?.candidate.animalId;

describe('compareTies', () => {
  it('prefers the lower level first, whatever else', () => {
    const common = candidate('common', 1, 'a much longer name');
    const rare = groupCandidate('rare', 4, 'short');
    expect(compareTies(input('x'), common, rare)).toBeLessThan(0);
    expect(compareTies(input('x'), rare, common)).toBeGreaterThan(0);
  });

  it('then a group over a species, then the shorter display name', () => {
    const group = groupCandidate('penguin', 1, 'Long group name');
    const species = candidate('emperor', 1, 'Emperor');
    expect(compareTies(input('x'), group, species)).toBeLessThan(0);
    const short = candidate('owl', 2, 'Owl');
    const long = candidate('barn-owl', 2, 'Barn owl');
    expect(compareTies(input('x'), short, long)).toBeLessThan(0);
  });

  it('falls back to a hash, so only the same animal compares equal', () => {
    const a = candidate('a', 1, 'cat x');
    const b = candidate('b', 1, 'cat y');
    expect(compareTies(input('cat'), a, b)).not.toBe(0);
    expect(compareTies(input('cat'), a, a)).toBe(0);
  });
});

describe('pickBest ties', () => {
  it('picks the same winner in any list order', () => {
    const a = candidate('a', 1, 'cat x');
    const b = candidate('b', 1, 'cat y');
    expect(winner('cat', a, b)).toBe(winner('cat', b, a));
  });

  it('never moves a tied suggestion to a rarer answer or past the group', () => {
    const african = candidate('african-penguin', 4, 'Penguin a');
    const emperor = candidate('emperor-penguin', 2, 'Penguin b');
    const group = groupCandidate('penguin-group', 2, 'Penguin c');
    for (const list of [
      [african, emperor, group],
      [group, african, emperor],
      [emperor, group, african],
    ]) {
      // Each name is "penguin" plus one letter: partial scores them all the same.
      expect(partial(input('penguin'), list, MATCHER_CONFIG)?.candidate.animalId).toBe(
        'penguin-group',
      );
    }
  });
});
