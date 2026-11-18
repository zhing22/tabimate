import { fnv1a } from './similarity';
import type { Candidate, Found, NormalizedInput, TieBreak, TieReason } from './types';

export interface Scored {
  /** Higher is better. */
  readonly score: number;
  readonly confidence: number;
}

/**
 * The whole guess appears as whole words in the display name ("penguin" in
 * "African penguin"). The display name, not an alias: "bear" must not favour
 * Koala through its alias "koala bear" over Brown bear.
 */
const wholeWordMatch = (c: Candidate, text: string): boolean =>
  ` ${c.names[0] ?? ''} `.includes(` ${text} `);

/**
 * How equally scored candidates are ordered, first rule first; lower key wins.
 * A suggestion must never jump to a more specific or rarer answer than the
 * guess supports, so whole-word matches, short names and groups come first.
 * The hash comes last so the winner never depends on the order answers are listed in.
 */
const TIE_RULES: readonly {
  readonly reason: TieReason;
  readonly key: (input: NormalizedInput, c: Candidate) => number;
}[] = [
  { reason: 'whole-word', key: (input, c) => (wholeWordMatch(c, input.text) ? 0 : 1) },
  { reason: 'shorter-name', key: (_, c) => c.names[0]?.length ?? 0 },
  { reason: 'group', key: (_, c) => (c.group ? 0 : 1) },
  { reason: 'lower-level', key: (_, c) => c.level },
  { reason: 'hash', key: (input, c) => fnv1a(`${input.text}\u0000${c.animalId}`) },
];

/** The first rule that tells `a` and `b` apart, and which way: negative when `a` wins. */
export function breakTie(
  input: NormalizedInput,
  a: Candidate,
  b: Candidate,
): { readonly order: number; readonly reason: TieReason | null } {
  for (const { reason, key } of TIE_RULES) {
    const order = key(input, a) - key(input, b);
    if (order !== 0) return { order, reason };
  }
  return { order: 0, reason: null };
}

/** Comparator for equally scored candidates (see TIE_RULES): negative when `a` wins. */
export const compareTies = (input: NormalizedInput, a: Candidate, b: Candidate): number =>
  breakTie(input, a, b).order;

/**
 * The candidate with the highest score; ties go by compareTies. When there was
 * a tie, `tie` says which rule decided it against the runner-up.
 */
export function pickBest(
  input: NormalizedInput,
  candidates: readonly Candidate[],
  scorer: (candidate: Candidate) => Scored | null,
): Found | null {
  let top: { candidate: Candidate; scored: Scored }[] = [];
  for (const candidate of candidates) {
    const scored = scorer(candidate);
    if (!scored) continue;
    const best = top[0]?.scored.score;
    if (best === undefined || scored.score > best) top = [{ candidate, scored }];
    else if (scored.score === best) top.push({ candidate, scored });
  }
  if (top.length === 0) return null;
  top.sort((a, b) => compareTies(input, a.candidate, b.candidate));
  const [winner, runnerUp] = [top[0]!, top[1]];
  const tie: TieBreak | null = runnerUp
    ? {
        reason: breakTie(input, winner.candidate, runnerUp.candidate).reason ?? 'hash',
        over: runnerUp.candidate.animalId,
      }
    : null;
  return { candidate: winner.candidate, confidence: winner.scored.confidence, tie };
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
