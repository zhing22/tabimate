import { gramOverlap } from './gramIndex';
import { pickBest } from './pick';
import type { Candidate, StrategyFn } from './types';

/** The name with the most trigrams in common, if similar enough (Dice coefficient). */
export const loose: StrategyFn = (input, candidates, cfg) => {
  const { names, shared, inputGramCount } = gramOverlap(candidates, input.text);
  const best = new Map<Candidate, number>();
  names.forEach(({ candidate, gramCount }, i) => {
    const count = shared[i]!;
    if (count === 0) return;
    const similarity = (2 * count) / (inputGramCount + gramCount);
    if (similarity > (best.get(candidate) ?? -1)) best.set(candidate, similarity);
  });

  return pickBest(input, candidates, (c) => {
    const similarity = best.get(c);
    return similarity !== undefined && similarity >= cfg.minSimilarity
      ? { score: similarity, confidence: similarity }
      : null;
  });
};
