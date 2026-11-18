import { MATCHER_CONFIG, MAX_INPUT_LENGTH, type MatcherConfig } from '@/config/game';
import type { Animal, AnimalId, MatchResult, Prompt } from '../types';
import { buildCandidates } from './candidates';
import { namesSeveralAnimals } from './lists';
import { normalize } from './normalize';
import { STRATEGIES } from './strategies';
import type { Candidate, Hit, NormalizedInput, Strategy } from './types';

/** Runs the strategies in order and returns the first hit. */
export function runStrategies(
  input: NormalizedInput,
  candidates: readonly Candidate[],
  cfg: MatcherConfig,
  strategies: readonly Strategy[] = STRATEGIES,
): Hit | null {
  for (const strategy of strategies) {
    const found = strategy.match(input, candidates, cfg);
    if (found) {
      const { animalId, level } = found.candidate;
      const { confidence, tie } = found;
      return { animalId, level, strategy: strategy.id, confidence, tie };
    }
  }
  return null;
}

/**
 * The first `max` characters of `raw`. Matching work grows with input length,
 * so a huge paste must not reach normalize. Never splits an emoji in half.
 */
export function clampInput(raw: string, max: number = MAX_INPUT_LENGTH): string {
  if (raw.length <= max) return raw;
  const cut = raw.slice(0, max);
  const last = cut.charCodeAt(cut.length - 1);
  // A lone high surrogate means the cut fell inside a two-unit character.
  return last >= 0xd800 && last <= 0xdbff ? cut.slice(0, -1) : cut;
}

const words = (text: string) => text.split(' ').length;

/**
 * Whether a close (non-exact) hit is really one animal, not a list of them.
 * Checked only for close hits on multi-word guesses: an exact name is never a
 * list, and a list needs more than one word.
 *  - At most one word more than the name it matched ("a red fox", "snow leo"),
 *    so a list of misspelled names ("plattypus tigerr koalaa") can't pass.
 *  - No two different animals named in full ("snow leopard tiger").
 */
function closeEnough(
  text: string,
  hit: Hit,
  candidates: readonly Candidate[],
  animals: ReadonlyMap<AnimalId, Animal>,
): boolean {
  if (!text.includes(' ')) return true;
  const names = candidates.find((c) => c.animalId === hit.animalId)?.names ?? [];
  const longest = Math.max(1, ...names.map(words));
  return words(text) <= longest + 1 && !namesSeveralAnimals(text, animals);
}

/**
 * Scores what the player typed against one prompt. Empty input, and a list
 * naming several animals, is always a miss. Input past MAX_INPUT_LENGTH is ignored, and result.input holds the cut text.
 */
export function matchAnswer(
  typed: string,
  prompt: Prompt,
  animals: ReadonlyMap<AnimalId, Animal>,
  cfg: MatcherConfig = MATCHER_CONFIG,
  strategies: readonly Strategy[] = STRATEGIES,
): MatchResult {
  const rawInput = clampInput(typed);
  const text = normalize(rawInput);
  const candidates = buildCandidates(prompt, animals);
  const found =
    text === '' ? null : runStrategies({ text, promptId: prompt.id }, candidates, cfg, strategies);
  const hit =
    found && (found.strategy === 'exact' || closeEnough(text, found, candidates, animals))
      ? found
      : null;
  if (!hit) return { level: 0, animalId: null, strategy: null, input: rawInput };
  return { level: hit.level, animalId: hit.animalId, strategy: hit.strategy, input: rawInput };
}
export { STRATEGIES } from './strategies';
