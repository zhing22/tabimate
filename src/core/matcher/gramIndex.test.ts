import { describe, expect, it } from 'vitest';
import { gramOverlap, minSharedGrams } from './gramIndex';
import { fnv1a, levenshtein, trigrams } from './similarity';
import { candidate } from './testFixtures';

const shared = (a: string, b: string) => {
  const gb = trigrams(b);
  return [...trigrams(a)].filter((g) => gb.has(g)).length;
};

// Deterministic "random" edits, so the property test is the same on every run.
function mutate(word: string, edits: number, seed: number): string {
  let out = word;
  for (let e = 0; e < edits; e++) {
    const h = fnv1a(`${seed}:${e}`);
    const at = h % (out.length + 1);
    const ch = 'abcdexyz '[(h >>> 8) % 9]!;
    const kind = (h >>> 16) % 3;
    if (kind === 0) out = out.slice(0, at) + ch + out.slice(at);
    else if (kind === 1) out = out.slice(0, at) + out.slice(at + 1);
    else out = out.slice(0, at) + ch + out.slice(at + 1);
  }
  return out;
}

describe('minSharedGrams', () => {
  it('never rules out a pair that is really within the edit limit', () => {
    const words = ['platypus', 'killer whale', 'aaaaaa', 'snow leopard', 'emu', 'abab abab'];
    let checked = 0;
    for (const word of words) {
      for (let seed = 0; seed < 400; seed++) {
        const typo = mutate(word, 1 + (seed % 2), seed);
        const distance = levenshtein(word, typo);
        if (distance > 2) continue;
        const bound = minSharedGrams(trigrams(word).size, trigrams(typo).size, distance);
        expect(shared(word, typo)).toBeGreaterThanOrEqual(bound);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });
});

describe('gramOverlap', () => {
  const candidates = [candidate('a', 1, 'tiger', 'big cat'), candidate('b', 2, 'emu')];

  it('counts shared trigrams for every name', () => {
    const { names, shared: counts, inputGramCount } = gramOverlap(candidates, 'tigers');
    expect(names.map((n) => n.name)).toEqual(['tiger', 'big cat', 'emu']);
    expect([...counts]).toEqual([shared('tigers', 'tiger'), 0, 0]);
    expect(inputGramCount).toBe(trigrams('tigers').size);
  });

  it('reuses the result for the same guess', () => {
    expect(gramOverlap(candidates, 'emu')).toBe(gramOverlap(candidates, 'emu'));
  });
});
