import { fnv1a } from './similarity';
import type { Candidate, Found, NormalizedInput } from './types';

export interface Scored {
  /** Higher is better. */
  readonly score: number;
  readonly confidence: number;
}

/**
 * Negative when `a` wins a tie with `b`. A suggestion must never jump to a
 * rarer answer than the player typed, so the lower level wins; then a group
 * ("penguin" over "African penguin"); then the shorter display name. Last, a
 * hash of input and id, so the winner never depends on the order answers are
 * listed in.
 */
export function compareTies(input: NormalizedInput, a: Candidate, b: Candidate): number {
  const hash = (c: Candidate) => fnv1a(`${input.text}\u0000${c.animalId}`);
  return (
    a.level - b.level ||
    Number(b.group) - Number(a.group) ||
    (a.names[0]?.length ?? 0) - (b.names[0]?.length ?? 0) ||
    hash(a) - hash(b)
  );
}

/** The candidate with the highest score; ties go by compareTies. */
export function pickBest(
  input: NormalizedInput,
  candidates: readonly Candidate[],
  scorer: (candidate: Candidate) => Scored | null,
): Found | null {
  let best: { found: Found; score: number } | null = null;
  for (const candidate of candidates) {
    const scored = scorer(candidate);
    if (!scored || (best && scored.score < best.score)) continue;
    if (best && scored.score === best.score) {
      if (compareTies(input, candidate, best.found.candidate) >= 0) continue;
    }
    best = { found: { candidate, confidence: scored.confidence }, score: scored.score };
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
