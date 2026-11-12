import { gramOverlap } from './gramIndex';
import { pickBest } from './pick';
import type { Candidate, StrategyFn } from './types';

/**
 * The name with the most trigrams in common, if similar enough (Dice
 * coefficient) and sharing at least cfg.looseMinInnerGrams real-letter trigrams,
 * so a shared first letter or two is never enough on its own.
 *
 * Some word of the guess must also begin the way some word of the name begins.
 * Otherwise a word buried inside a name wins: "bird" is in "hummingbird", but
 * someone typing "bird" did not mean a hummingbird.
 */
export const loose: StrategyFn = (input, candidates, cfg) => {
  const { names, shared, sharedInner, inputGramCount } = gramOverlap(candidates, input.text);
  const starts = input.text.split(' ').map((word) => ` ${word.slice(0, 2)}`);
  const best = new Map<Candidate, number>();
  names.forEach(({ candidate, name, gramCount }, i) => {
    if (sharedInner[i]! < cfg.looseMinInnerGrams) return;
    const spaced = ` ${name}`;
    if (!starts.some((start) => spaced.includes(start))) return;
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
