// Shared vocabulary of the game. Pure types only. Level ids and colours come from
// config/, because core depends on config and never the other way round.
import type { Movement, SizeClass } from '@/config/animals';
import type { HexColour } from '@/config/colour';
import type {
  ActiveTime,
  AnimalClass,
  AnimalKind,
  BodySize,
  Continent,
  Diet,
  Habitat,
  Social,
} from '@/config/traits';
import type { AnswerLevel } from '@/config/levels';
import type { BonusItem, BonusResult } from './bonusTypes';

export type { BonusItem, BonusResult } from './bonusTypes';

// Trait value types, re-exported for consumers of core. The allowed values themselves
// (ANIMAL_CLASSES, DIETS, ...) live in config/traits.ts; these types are derived from them.
export type {
  ActiveTime,
  AnimalClass,
  AnimalKind,
  BodySize,
  Continent,
  Diet,
  Habitat,
  Movement,
  SizeClass,
  Social,
};

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
  /** A group ("penguin") is a family of species; a species may belong to one. */
  readonly kind: AnimalKind;
  /** The group this belongs to, if any. */
  readonly parent?: AnimalId;
  /** Groups only: the descendant species whose sprite the group borrows. */
  readonly representative?: AnimalId;
  /** One line, 15 words or fewer, drafted from Wikipedia. */
  readonly description?: string;
  /** True once a person has checked the description. */
  readonly descriptionReviewed?: boolean;
  /** Wikipedia link, always shown beside the description. */
  readonly wiki?: string;
  readonly traits?: AnimalTraits;
}

/** A [min, max] range in metres. */
export type MetreRange = readonly [number, number];

/** Facts prompt templates can query. All optional: unknown is not the same as false. */
export interface AnimalTraits {
  readonly class?: AnimalClass;
  readonly diet?: readonly Diet[];
  readonly habitat?: readonly Habitat[];
  readonly continent?: readonly Continent[];
  readonly legs?: number;
  readonly tail?: boolean;
  readonly gills?: boolean;
  readonly shell?: boolean;
  readonly horns?: boolean;
  readonly feathers?: boolean;
  readonly pouch?: boolean;
  readonly flies?: boolean;
  /** Lays eggs (true for birds and monotremes, false for most mammals). */
  readonly eggs?: boolean;
  readonly social?: Social;
  readonly active?: ActiveTime;
  readonly extinct?: boolean;
  /** Altitudes it lives at, metres above sea level. */
  readonly altitudeM?: MetreRange;
  /** Depths it lives at, metres below the surface. */
  readonly depthM?: MetreRange;
  readonly size?: BodySize;
}

/** Every animal by id: the shape the data layer hands to core. */
export type AnimalLookup = ReadonlyMap<AnimalId, Animal>;

export interface PuzzleAnswer {
  readonly animalId: AnimalId;
  readonly level: AnswerLevel;
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
  /**
   * The bonus quiz after the last prompt, on a day whose theme has one
   * (Sunday Deep Dive) and a quiz file. Absent on other days.
   */
  readonly bonus?: readonly BonusItem[];
}

/** Names of the matcher strategies; the matcher's registry is keyed by these. */
export type StrategyId = 'exact' | 'alias' | 'typo' | 'partial' | 'loose';

/** A hit always has an animal and the strategy that found it; a miss has neither. */
export type MatchResult =
  | {
      readonly level: 0;
      readonly animalId: null;
      readonly strategy: null;
      /** Raw text the player typed ('' on timeout). */
      readonly input: string;
    }
  | {
      readonly level: AnswerLevel;
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

/** 'bonus' only on a bonus quiz day, between the last reveal and 'finished'. */
export type RunStatus = 'idle' | 'playing' | 'revealing' | 'bonus' | 'finished';

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
  /** Bonus questions this run has (0 on a day without a quiz). */
  readonly bonusCount: number;
  readonly bonusResults: readonly BonusResult[];
  /**
   * While 'bonus': when the current question's time runs out, or null between
   * questions (before the first, and while an explanation shows).
   */
  readonly bonusEndsAt: number | null;
}
