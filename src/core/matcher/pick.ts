import { fnv1a } from './similarity';
import type { Candidate, Found, NormalizedInput } from './types';

export interface Scored {
  /** Higher is better. */
  readonly score: number;
  readonly confidence: number;
}

/**
 * The candidate with the highest score. Ties go to the lowest hash of input and
 * animal id, so the winner does not depend on the order answers are listed in.
 */
export function pickBest(
  input: NormalizedInput,
  candidates: readonly Candidate[],
  scorer: (candidate: Candidate) => Scored | null,
): Found | null {
  let best: { found: Found; score: number; tie: number } | null = null;
  for (const candidate of candidates) {
    const scored = scorer(candidate);
    if (!scored || (best && scored.score < best.score)) continue;
    const tie = fnv1a(`${input.text}\u0000${candidate.animalId}`);
    if (best && scored.score === best.score && tie >= best.tie) continue;
    best = { found: { candidate, confidence: scored.confidence }, score: scored.score, tie };
  }
  return best?.found ?? null;
}

/** The best-scoring name of one candidate. */
export function bestName(
  candidate: Candidate,
  scoreName: (name: string) => Scored | null,
): Scored | null {
  let best: Scored | null = null;
  for (const name of candidate.names) {
    const scored = scoreName(name);
    if (scored && (!best || scored.score > best.score)) best = scored;
  }
  return best;
}
