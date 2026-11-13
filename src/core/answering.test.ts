import { describe, expect, it } from 'vitest';
import { MATCHER_CONFIG } from '@/config/game';
import { judgeGuess, timeUpMatch } from './answering';
import { ANIMALS, PROMPT } from './matcher/testFixtures';

const judge = (input: string) => judgeGuess(input, PROMPT, ANIMALS, MATCHER_CONFIG);
const timeUp = (draft: string) => timeUpMatch(draft, PROMPT, ANIMALS, MATCHER_CONFIG);

describe('judgeGuess', () => {
  it('scores an exact name', () => {
    expect(judge('Killer whales')).toEqual({
      kind: 'exact',
      match: { tier: 1, animalId: 'killer-whale', strategy: 'exact', input: 'Killer whales' },
    });
  });

  it.each([
    ['orca', 'Killer whale'],
    ['platipus', 'Platypus'],
    ['snow leo', 'Snow leopard'],
  ])('offers the display name for a close guess %j', (input, suggestion) => {
    expect(judge(input)).toEqual({ kind: 'close', input, suggestion });
  });

  it.each(['James', 'platypus tiger'])('rejects %j', (input) => {
    expect(judge(input)).toEqual({ kind: 'none', input });
  });

  it('offers a name that then scores exactly', () => {
    const verdict = judge('orca');
    if (verdict.kind !== 'close') throw new Error('expected a suggestion');
    expect(judge(verdict.suggestion).kind).toBe('exact');
  });
});

describe('timeUpMatch', () => {
  it('scores only an exact name', () => {
    expect(timeUp('tiger')).toMatchObject({ tier: 4, animalId: 'tiger' });
  });

  it.each(['platipus', 'James', ''])('counts %j as a miss, keeping the text', (draft) => {
    expect(timeUp(draft)).toEqual({ tier: 0, animalId: null, strategy: null, input: draft });
  });
});
