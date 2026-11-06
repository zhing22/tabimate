import type { AnswerTierId } from '@/config/tiers';
import { fnv1a, unitHash } from './similarity';
import type { Candidate, StrategyFn } from './types';

const ANSWER_TIERS: readonly AnswerTierId[] = [1, 2, 3, 4, 5];

/**
 * Picks a tier by weight, counting only tiers this prompt actually has answers
 * in. Returns null when none of them has any weight (e.g. only tier 5 answers).
 */
function pickTier(
  candidates: readonly Candidate[],
  weights: Readonly<Record<AnswerTierId, number>>,
  roll: number,
): AnswerTierId | null {
  const present = ANSWER_TIERS.filter(
    (tier) => weights[tier] > 0 && candidates.some((c) => c.tier === tier),
  );
  const total = present.reduce((sum, tier) => sum + weights[tier], 0);
  let left = roll * total;
  for (const tier of present) {
    left -= weights[tier];
    if (left < 0) return tier;
  }
  return null;
}

/**
 * Last resort for a guess that resembles no answer. Hits with probability
 * cfg.luckyHitChance; every roll comes from a hash of prompt and input, so the
 * same guess on the same prompt always gets the same result.
 */
export const lucky: StrategyFn = (input, candidates, cfg) => {
  if (input.text === '' || candidates.length === 0) return null;
  const seed = `${input.promptId}\u0000${input.text}`;
  if (unitHash(seed) >= cfg.luckyHitChance) return null;

  const tier = pickTier(candidates, cfg.luckyTierWeights, unitHash(`${seed}\u0000tier`));
  if (tier === null) return null;
  const pool = candidates.filter((c) => c.tier === tier);
  const candidate = pool[fnv1a(`${seed}\u0000pick`) % pool.length];
  return candidate ? { candidate, confidence: 0 } : null;
};
