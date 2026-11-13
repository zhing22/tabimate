import type { MatcherConfig } from '@/config/game';
import { matchAnswer } from './matcher';
import type { Animal, AnimalId, MatchResult, Prompt } from './types';

/** What a guess sent with Go does (see CLAUDE.md "Answering"). */
export type Verdict =
  /** The exact name of an answer: scored. */
  | { readonly kind: 'exact'; readonly match: MatchResult }
  /** Close to an answer: offer its exact name, score nothing yet. */
  | { readonly kind: 'close'; readonly input: string; readonly suggestion: string }
  /** Not on the list: score nothing, let them retry. */
  | { readonly kind: 'none'; readonly input: string };

const miss = (input: string): MatchResult => ({
  tier: 0,
  animalId: null,
  strategy: null,
  input,
});

/** The name a close guess is corrected to: the one an exact match needs. */
const nameOf = (animals: ReadonlyMap<AnimalId, Animal>, id: AnimalId) =>
  animals.get(id)?.display ?? id.replace(/-/g, ' ');

export function judgeGuess(
  input: string,
  prompt: Prompt,
  animals: ReadonlyMap<AnimalId, Animal>,
  cfg: MatcherConfig,
): Verdict {
  const match = matchAnswer(input, prompt, animals, cfg);
  if (match.animalId === null) return { kind: 'none', input: match.input };
  if (match.strategy === 'exact') return { kind: 'exact', match };
  return { kind: 'close', input: match.input, suggestion: nameOf(animals, match.animalId) };
}

/**
 * Time ran out with `draft` in the box. Only an exact name scores: a close
 * guess was never confirmed by the player, so it counts as a miss.
 */
export function timeUpMatch(
  draft: string,
  prompt: Prompt,
  animals: ReadonlyMap<AnimalId, Animal>,
  cfg: MatcherConfig,
): MatchResult {
  const verdict = judgeGuess(draft, prompt, animals, cfg);
  return verdict.kind === 'exact' ? verdict.match : miss(verdict.input);
}
