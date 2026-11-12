import { MATCHER_CONFIG, MAX_INPUT_LENGTH, type MatcherConfig } from '@/config/game';
import type { Animal, AnimalId, MatchResult, Prompt } from '../types';
import { buildCandidates } from './candidates';
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
      const { animalId, tier } = found.candidate;
      return { animalId, tier, strategy: strategy.id, confidence: found.confidence };
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

/**
 * Scores what the player typed against one prompt. Empty input is always a
 * miss. Input past MAX_INPUT_LENGTH is ignored, and result.input holds the cut text.
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
  const hit =
    text === ''
      ? null
      : runStrategies(
          { text, promptId: prompt.id },
          buildCandidates(prompt, animals),
          cfg,
          strategies,
        );
  if (!hit) return { tier: 0, animalId: null, strategy: null, input: rawInput };
  return { tier: hit.tier, animalId: hit.animalId, strategy: hit.strategy, input: rawInput };
}
export { STRATEGIES } from './strategies';
