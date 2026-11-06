import { describe, expect, it } from 'vitest';
import { MATCHER_CONFIG, type MatcherConfig } from '@/config/game';
import type { StrategyId } from '../types';
import { STRATEGIES, alias, exact, loose, partial, typo } from './strategies';
import { candidate } from './testFixtures';
import type { NormalizedInput } from './types';

const cfg: MatcherConfig = MATCHER_CONFIG;
const input = (text: string): NormalizedInput => ({ text, promptId: 'p' });
const idOf = (found: ReturnType<typeof exact>) => found?.candidate.animalId ?? null;

const fox = candidate('red-fox', 1, 'Red fox', 'fox');
const whale = candidate('killer-whale', 1, 'Killer whale', 'orca');
const platypus = candidate('platypus', 2, 'Platypus');
const brownBear = candidate('brown-bear', 1, 'Brown bear');
const sunBear = candidate('sun-bear', 3, 'Sun bear');
const all = [fox, whale, platypus, brownBear, sunBear];

describe('exact', () => {
  it('matches the display name only', () => {
    expect(idOf(exact(input('red fox'), all, cfg))).toBe('red-fox');
    expect(exact(input('orca'), all, cfg)).toBeNull();
    expect(exact(input('red fo'), all, cfg)).toBeNull();
  });
});

describe('alias', () => {
  it('matches aliases only', () => {
    expect(idOf(alias(input('orca'), all, cfg))).toBe('killer-whale');
    expect(alias(input('killer whale'), all, cfg)).toBeNull();
  });
});

describe('typo', () => {
  it('accepts up to typoMaxDistance edits on long enough names', () => {
    expect(idOf(typo(input('platipus'), all, cfg))).toBe('platypus');
    expect(idOf(typo(input('kiler whal'), all, cfg))).toBe('killer-whale');
    expect(typo(input('plaxxxus'), all, cfg)).toBeNull();
  });

  it('ignores names shorter than typoMinLength', () => {
    // "orca" is 4 letters: "orko" would be 2 edits, but that is half the word.
    expect(typo(input('orko'), all, cfg)).toBeNull();
  });

  it('gives lower confidence to more edits', () => {
    const one = typo(input('platipus'), all, cfg)?.confidence ?? 0;
    const two = typo(input('platipas'), all, cfg)?.confidence ?? 0;
    expect(one).toBeGreaterThan(two);
  });
});

describe('partial', () => {
  it('finds the input inside a name, or a name inside the input', () => {
    expect(idOf(partial(input('plat'), all, cfg))).toBe('platypus');
    expect(idOf(partial(input('whale'), all, cfg))).toBe('killer-whale');
    expect(idOf(partial(input('a big red fox'), all, cfg))).toBe('red-fox');
  });

  it('prefers the shortest matching name', () => {
    expect(idOf(partial(input('bear'), all, cfg))).toBe('sun-bear');
  });

  it('needs at least partialMinLength characters', () => {
    expect(partial(input('p'), all, cfg)).toBeNull();
    expect(partial(input('pl'), all, cfg)).toBeNull();
  });

  // Names and tiers from the real puzzles, where these short guesses used to win
  // rare animals for everyone.
  const real = [
    candidate('tiger', 4, 'Tiger'),
    candidate('sea-otter', 4, 'Sea otter'),
    candidate('chimpanzee', 4, 'Chimpanzee'),
    candidate('polar-bear', 3, 'Polar bear'),
    candidate('giant-panda', 3, 'Giant panda'),
  ];

  it.each(['er', 'an', 'ar', 'ger', 'ant'])('does not match %j inside a word', (guess) => {
    expect(partial(input(guess), real, cfg)).toBeNull();
  });

  it('matches only from the start of a word', () => {
    expect(idOf(partial(input('tig'), real, cfg))).toBe('tiger');
    expect(idOf(partial(input('otter'), real, cfg))).toBe('sea-otter');
    expect(idOf(partial(input('chimp'), real, cfg))).toBe('chimpanzee');
    expect(partial(input('panzee'), real, cfg)).toBeNull();
  });

  it('needs the shorter side to cover partialMinCoverage of the longer', () => {
    // "sea" is 3 of 9 characters of "sea otter", below 0.4.
    expect(partial(input('sea'), real, cfg)).toBeNull();
    expect(idOf(partial(input('sea'), real, { ...cfg, partialMinCoverage: 0.3 }))).toBe(
      'sea-otter',
    );
  });

  it('accepts a whole name inside the input only as whole words', () => {
    expect(idOf(partial(input('a tiger cub'), real, cfg))).toBe('tiger');
    expect(partial(input('tigerish cat'), real, cfg)).toBeNull();
  });

  it('breaks ties by hash, not by list order', () => {
    const a = candidate('a', 1, 'cat x');
    const b = candidate('b', 1, 'cat y');
    expect(idOf(partial(input('cat'), [a, b], cfg))).toBe(idOf(partial(input('cat'), [b, a], cfg)));
  });
});

describe('loose', () => {
  it('takes the most similar name above minSimilarity', () => {
    expect(idOf(loose(input('platapuss'), all, cfg))).toBe('platypus');
    expect(loose(input('zzzz'), all, cfg)).toBeNull();
  });

  it('respects minSimilarity', () => {
    expect(loose(input('platapuss'), all, { ...cfg, minSimilarity: 0.99 })).toBeNull();
  });
});

describe('STRATEGIES', () => {
  it('runs in the documented order', () => {
    const order: StrategyId[] = ['exact', 'alias', 'typo', 'partial', 'loose', 'lucky'];
    expect(STRATEGIES.map((s) => s.id)).toEqual(order);
  });
});
