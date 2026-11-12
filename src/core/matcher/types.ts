import type { MatcherConfig } from '@/config/game';
import type { AnswerTierId } from '@/config/tiers';
import type { AnimalId, PromptId, StrategyId } from '../types';

/** A guess after normalize(), with the prompt it answers. */
export interface NormalizedInput {
  readonly text: string;
  readonly promptId: PromptId;
}

/** One accepted answer of a prompt, with its names ready for matching. */
export interface Candidate {
  readonly animalId: AnimalId;
  readonly tier: AnswerTierId;
  /** Normalized names: the display name first, then the aliases. */
  readonly names: readonly string[];
  /** Trigrams of each name, same order. Precomputed: 'loose' compares against all of them. */
  readonly grams: readonly ReadonlySet<string>[];
}

/** What a strategy finds. The pipeline adds which strategy it was, so none can mislabel itself. */
export interface Found {
  readonly candidate: Candidate;
  /** 0..1, how sure the strategy is. */
  readonly confidence: number;
}

export type StrategyFn = (
  input: NormalizedInput,
  candidates: readonly Candidate[],
  cfg: MatcherConfig,
) => Found | null;

export interface Strategy {
  readonly id: StrategyId;
  readonly match: StrategyFn;
}

export interface Hit {
  readonly animalId: AnimalId;
  readonly tier: AnswerTierId;
  readonly strategy: StrategyId;
  readonly confidence: number;
}
