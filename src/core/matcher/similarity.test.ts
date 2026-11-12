import { describe, expect, it } from 'vitest';
import { fnv1a, gramSimilarity, levenshtein, trigramSimilarity, trigrams } from './similarity';

describe('levenshtein', () => {
  it.each([
    ['', '', 0],
    ['abc', '', 3],
    ['', 'abc', 3],
    ['platypus', 'platypus', 0],
    ['platipus', 'platypus', 1],
    ['kitten', 'sitting', 3],
    ['flaw', 'lawn', 2],
  ])('%j vs %j = %i', (a, b, distance) => {
    expect(levenshtein(a, b)).toBe(distance);
    expect(levenshtein(b, a)).toBe(distance);
  });

  it('stops at max and reports max + 1', () => {
    expect(levenshtein('kitten', 'sitting', 2)).toBe(3);
    expect(levenshtein('a', 'abcdefgh', 2)).toBe(3);
    expect(levenshtein('kitten', 'sitting', 3)).toBe(3);
  });
});

describe('trigrams and similarity', () => {
  it('pads so short words still have trigrams', () => {
    expect([...trigrams('cat')]).toEqual(['  c', ' ca', 'cat', 'at ']);
    expect(trigrams('a').size).toBe(2);
  });

  it('scores 1 for identical, 0 for nothing shared, between for near', () => {
    expect(trigramSimilarity('tiger', 'tiger')).toBe(1);
    expect(trigramSimilarity('tiger', 'xyz')).toBe(0);
    const near = trigramSimilarity('tigar', 'tiger');
    expect(near).toBeGreaterThan(0.3);
    expect(near).toBeLessThan(1);
  });

  it('treats two empty sets as identical', () => {
    expect(gramSimilarity(new Set(), new Set())).toBe(1);
  });
});

describe('fnv1a', () => {
  it('matches the reference FNV-1a values', () => {
    expect(fnv1a('')).toBe(0x811c9dc5);
    expect(fnv1a('a')).toBe(0xe40c292c);
    expect(fnv1a('foobar')).toBe(0xbf9cf968);
  });
});
