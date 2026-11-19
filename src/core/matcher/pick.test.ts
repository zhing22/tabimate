import { describe, expect, it } from 'vitest';
import type { AnswerLevel } from '@/config/levels';
import { breakTie, compareTies, pickBest } from './pick';
import { candidate, groupCandidate } from './testFixtures';
import type { Candidate, NormalizedInput, TieReason } from './types';

const input = (text: string): NormalizedInput => ({ text, promptId: 'p' });
const SAME = () => ({ score: 1, confidence: 1 });
const sp = (id: string, level: AnswerLevel, ...names: string[]) => candidate(id, level, ...names);
const gr = (id: string, level: AnswerLevel, ...names: string[]) =>
  groupCandidate(id, level, ...names);

// [guess, winner, loser, the rule that decides]
const TIES: readonly [string, Candidate, Candidate, TieReason][] = [
  // The whole guess as whole words beats a longer, rarer, or group candidate without it.
  ['seal', sp('harbour-seal', 3, 'Harbour seal'), gr('sea-lion', 1, 'Sealion'), 'whole-word'],
  ['bear', sp('polar-bear', 4, 'Polar bear'), sp('bearded', 1, 'Bearded dragon'), 'whole-word'],
  // Only the display name counts: Koala's alias "koala bear" does not make "bear" a word of Koala.
  ['bear', sp('brown-bear', 1, 'Brown bear'), sp('koala', 3, 'Koala', 'koala bear'), 'whole-word'],
  // Then the shorter display name, even over a group or a lower level.
  ['peng', sp('emperor', 4, 'Penguin e'), gr('penguins', 1, 'Penguin fam'), 'shorter-name'],
  ['owl', sp('barn-owl', 2, 'Barn owl'), sp('snowy-owl', 1, 'Snowy owl'), 'shorter-name'],
  // Then a group over a species.
  ['cat', gr('big-cat', 4, 'Big cat'), sp('sea-cat', 1, 'Sea cat'), 'group'],
  // Then the existing rule: lower level, then the hash.
  ['bear', sp('brown-bear', 1, 'Brown bear'), sp('polar-bear', 2, 'Polar bear'), 'lower-level'],
];

describe('breakTie and compareTies', () => {
  it.each(TIES)('%j: %o beats %o by %s', (guess, winner, loser, reason) => {
    expect(breakTie(input(guess), winner, loser)).toEqual({
      order: expect.any(Number) as number,
      reason,
    });
    expect(compareTies(input(guess), winner, loser)).toBeLessThan(0);
    expect(compareTies(input(guess), loser, winner)).toBeGreaterThan(0);
  });

  it('falls back to a hash, so only the same animal compares equal', () => {
    const a = sp('a', 1, 'cat x');
    const b = sp('b', 1, 'cat y');
    expect(breakTie(input('cat'), a, b).reason).toBe('hash');
    expect(breakTie(input('cat'), a, a)).toEqual({ order: 0, reason: null });
  });
});

describe('pickBest', () => {
  it.each(TIES)('%j picks the same winner in either order, and says why', (g, w, l, reason) => {
    for (const list of [
      [w, l],
      [l, w],
    ]) {
      expect(pickBest(input(g), list, SAME)).toEqual({
        candidate: w,
        confidence: 1,
        tie: { reason, over: l.animalId },
      });
    }
  });

  it('reports no tie when one candidate scores best', () => {
    const a = sp('a', 1, 'A');
    const b = sp('b', 1, 'B');
    const found = pickBest(input('a'), [a, b], (c) => (c === a ? SAME() : null));
    expect(found).toEqual({ candidate: a, confidence: 1, tie: null });
  });
});
