import { describe, expect, it } from 'vitest';
import { MATCHER_CONFIG, type MatcherConfig } from '@/config/game';
import { lucky } from './lucky';
import { candidate } from './testFixtures';
import type { NormalizedInput } from './types';

const cfg: MatcherConfig = MATCHER_CONFIG;
const oneOfEachTier = ([1, 2, 3, 4, 5] as const).map((tier) =>
  candidate(`t${tier}`, tier, `t${tier}`),
);
const guesses: NormalizedInput[] = Array.from({ length: 10_000 }, (_, i) => ({
  text: `guess ${i}`,
  promptId: 'p',
}));

function tierCounts(candidates = oneOfEachTier, config = cfg) {
  const counts = { miss: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const guess of guesses) {
    const found = lucky(guess, candidates, config);
    if (found) counts[found.candidate.tier]++;
    else counts.miss++;
  }
  return counts;
}

describe('lucky', () => {
  it('hits about luckyHitChance of the time', () => {
    const hits = guesses.length - tierCounts().miss;
    expect(hits / guesses.length).toBeCloseTo(cfg.luckyHitChance, 1);
  });

  it('weights tiers by luckyTierWeights and never gives tier 5', () => {
    const counts = tierCounts();
    const hits = guesses.length - counts.miss;
    const weights = cfg.luckyTierWeights;
    const total = weights[1] + weights[2] + weights[3] + weights[4] + weights[5];
    for (const tier of [1, 2, 3, 4] as const) {
      expect(Math.abs(counts[tier] / hits - weights[tier] / total)).toBeLessThan(0.04);
    }
    expect(counts[5]).toBe(0);
  });

  it('is deterministic per prompt and input', () => {
    const run = (text: string, promptId: string) =>
      lucky({ text, promptId }, oneOfEachTier, cfg)?.candidate.animalId ?? null;
    for (const guess of guesses.slice(0, 200)) {
      expect(run(guess.text, 'p')).toBe(run(guess.text, 'p'));
    }
    // A different prompt rolls differently, so the same word is not lucky everywhere.
    const onP = guesses.map((g) => run(g.text, 'p'));
    const onQ = guesses.map((g) => run(g.text, 'q'));
    expect(onP).not.toEqual(onQ);
  });

  it('can be turned off or made certain', () => {
    expect(tierCounts(oneOfEachTier, { ...cfg, luckyHitChance: 0 }).miss).toBe(guesses.length);
    expect(tierCounts(oneOfEachTier, { ...cfg, luckyHitChance: 1 }).miss).toBe(0);
  });

  it('only picks from tiers the prompt has', () => {
    const lowTiers = [candidate('a', 1, 'a'), candidate('b', 2, 'b')];
    const counts = tierCounts(lowTiers, { ...cfg, luckyHitChance: 1 });
    expect(counts[1] + counts[2]).toBe(guesses.length);
  });

  it('misses when every tier present has zero weight', () => {
    const onlyTier5 = [candidate('cr', 5, 'cr')];
    expect(tierCounts(onlyTier5, { ...cfg, luckyHitChance: 1 }).miss).toBe(guesses.length);
  });

  it('misses on empty input or no candidates', () => {
    const sure = { ...cfg, luckyHitChance: 1 };
    expect(lucky({ text: '', promptId: 'p' }, oneOfEachTier, sure)).toBeNull();
    expect(lucky({ text: 'x', promptId: 'p' }, [], sure)).toBeNull();
  });
});
