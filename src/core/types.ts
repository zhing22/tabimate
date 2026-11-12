// Shared vocabulary of the game. Pure types only. Tier ids and colours come from
// config/, because core depends on config and never the other way round.
import type { Movement, SizeClass } from '@/config/animals';
import type { HexColour } from '@/config/colour';
import type { AnswerTierId } from '@/config/tiers';

export type { Movement, SizeClass };

export type AnimalId = string;
export type PromptId = string;

/** SGT calendar date as 'YYYY-MM-DD'; also the puzzle file name. */
export type DateKey = string;

export interface Animal {
  readonly id: AnimalId;
  readonly display: string;
  readonly aliases: readonly string[];
  /** Sprite sheet shared by similar animals, e.g. 'big-cat'. */
  readonly archetype: string;
  readonly movement: Movement;
  readonly size: SizeClass;
  /** Colour for placeholder sprites, until palette-based pixel sprites replace them. */
  readonly tint: HexColour;
  readonly emoji: string;
}

export interface PuzzleAnswer {
  readonly animalId: AnimalId;
  readonly tier: AnswerTierId;
}

export interface Prompt {
  readonly id: PromptId;
  readonly text: string;
  readonly answers: readonly PuzzleAnswer[];
}

export interface Puzzle {
  readonly date: DateKey;
  /** Day count since launch, starting at 1. */
  readonly number: number;
  readonly prompts: readonly Prompt[];
}

/** Names of the matcher strategies; the matcher's registry is keyed by these. */
export type StrategyId = 'exact' | 'alias' | 'typo' | 'partial' | 'loose';

/** A hit always has an animal and the strategy that found it; a miss has neither. */
export type MatchResult =
  | {
      readonly tier: 0;
      readonly animalId: null;
      readonly strategy: null;
      /** Raw text the player typed ('' on timeout). */
      readonly input: string;
    }
  | {
      readonly tier: AnswerTierId;
      readonly animalId: AnimalId;
      readonly strategy: StrategyId;
      readonly input: string;
    };

export interface RoundResult {
  readonly promptId: PromptId;
  /** What the player typed lives in match.input, so there is only one copy. */
  readonly match: MatchResult;
  readonly timeMs: number;
}

// A union so 'unlimited' | 'archive' can be added without touching callers.
export type GameMode = 'daily';

export type RunStatus = 'idle' | 'playing' | 'revealing' | 'finished';

/**
 * There is no stored round index: it is derived from results, so the two can
 * never disagree. While 'playing', the current round is results.length; while
 * 'revealing', it is results.length - 1 (its result was just added).
 */
export interface RunState {
  readonly mode: GameMode;
  readonly puzzleDate: DateKey;
  /** Prompts in this run's puzzle, so the reducer knows when the run is over. */
  readonly promptCount: number;
  readonly results: readonly RoundResult[];
  readonly status: RunStatus;
  /**
   * When the current round's time runs out (epoch ms, injected Clock). Set
   * while 'playing', null otherwise. Saved with the run so a reload cannot
   * restart the timer.
   */
  readonly roundEndsAt: number | null;
}
