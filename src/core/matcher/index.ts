import { MATCHER_CONFIG, type MatcherConfig } from '@/config/game';
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

/** Scores what the player typed against one prompt. Empty input is always a miss. */
export function matchAnswer(
  rawInput: string,
  prompt: Prompt,
  animals: ReadonlyMap<AnimalId, Animal>,
  cfg: MatcherConfig = MATCHER_CONFIG,
  strategies: readonly Strategy[] = STRATEGIES,
): MatchResult {
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
