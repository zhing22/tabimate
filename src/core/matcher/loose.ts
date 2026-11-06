import { gramOverlap } from './gramIndex';
import { pickBest } from './pick';
import type { Candidate, StrategyFn } from './types';

/**
 * The name with the most trigrams in common, if similar enough (Dice
 * coefficient) and sharing at least cfg.looseMinInnerGrams real-letter trigrams,
 * so a shared first letter or two is never enough on its own.
 */
export const loose: StrategyFn = (input, candidates, cfg) => {
  const { names, shared, sharedInner, inputGramCount } = gramOverlap(candidates, input.text);
  const best = new Map<Candidate, number>();
  names.forEach(({ candidate, gramCount }, i) => {
    if (sharedInner[i]! < cfg.looseMinInnerGrams) return;
    const similarity = (2 * shared[i]!) / (inputGramCount + gramCount);
    if (similarity > (best.get(candidate) ?? -1)) best.set(candidate, similarity);
  });

  return pickBest(input, candidates, (c) => {
    const similarity = best.get(c);
    return similarity !== undefined && similarity >= cfg.minSimilarity
      ? { score: similarity, confidence: similarity }
      : null;
  });
};
