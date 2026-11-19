import type { MatcherConfig } from '@/config/game';
import type { AnswerLevel } from '@/config/levels';
import type { AnimalId, PromptId, StrategyId } from '../types';

/** A guess after normalize(), with the prompt it answers. */
export interface NormalizedInput {
  readonly text: string;
  readonly promptId: PromptId;
}

/** One accepted answer of a prompt, with its names ready for matching. */
export interface Candidate {
  readonly animalId: AnimalId;
  readonly level: AnswerLevel;
  /** A group ("penguin") rather than a species: preferred when scores tie. */
  readonly group: boolean;
  /** Normalized names: the display name first, then the aliases. */
  readonly names: readonly string[];
  /** Trigrams of each name, same order. Precomputed: 'loose' compares against all of them. */
  readonly grams: readonly ReadonlySet<string>[];
}

/** Which tie-break rule decided between equally scored candidates (see pick.ts TIE_RULES). */
export type TieReason = 'whole-word' | 'shorter-name' | 'group' | 'lower-level' | 'hash';

export interface TieBreak {
  readonly reason: TieReason;
  /** The runner-up it beat. */
  readonly over: AnimalId;
}

/** What a strategy finds. The pipeline adds which strategy it was, so none can mislabel itself. */
export interface Found {
  readonly candidate: Candidate;
  /** 0..1, how sure the strategy is. */
  readonly confidence: number;
  /** Set when other candidates scored the same: why this one won. */
  readonly tie: TieBreak | null;
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
  readonly level: AnswerLevel;
  readonly strategy: StrategyId;
  readonly confidence: number;
  readonly tie: TieBreak | null;
}
