// Shared vocabulary of the game. Pure types only: no values, no imports from other layers.

/** 0 = no match; 1–5 follow IUCN Red List categories, rarer is higher. */
export type TierId = 0 | 1 | 2 | 3 | 4 | 5;

/** Tiers a real answer can have (tier 0 is only ever a miss). */
export type AnswerTierId = Exclude<TierId, 0>;

export type Movement = 'land' | 'sky' | 'water';
export type SizeClass = 'S' | 'M' | 'L';

export type AnimalId = string;

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
  /** Hex colour used by placeholder sprites until palettes land (Step 8b). */
  readonly tint: string;
  readonly emoji: string;
}

export interface PuzzleAnswer {
  readonly animalId: AnimalId;
  readonly tier: AnswerTierId;
}

export interface Prompt {
  readonly id: string;
  readonly text: string;
  readonly answers: readonly PuzzleAnswer[];
}

export interface Puzzle {
  readonly date: DateKey;
  /** Day count since launch, starting at 1. */
  readonly number: number;
  readonly prompts: readonly Prompt[];
}

export interface MatchResult {
  readonly tier: TierId;
  readonly animalId: AnimalId | null;
  /** Name of the matcher strategy that produced the hit, or 'none'. */
  readonly strategy: string;
  readonly input: string;
}

export interface RoundResult {
  readonly promptId: string;
  readonly input: string;
  readonly match: MatchResult;
  readonly timeMs: number;
}

// A union so 'unlimited' | 'archive' can be added without touching callers.
export type GameMode = 'daily';

export type RunStatus = 'idle' | 'playing' | 'revealing' | 'finished';

export interface RunState {
  readonly mode: GameMode;
  readonly puzzleDate: DateKey;
  readonly roundIndex: number;
  readonly results: readonly RoundResult[];
  readonly status: RunStatus;
}

export interface MatcherConfig {
  /** Trigram similarity (0..1) the 'loose' strategy needs to accept a hit. */
  readonly minSimilarity: number;
  /** Max Levenshtein distance the 'typo' strategy accepts. */
  readonly typoMaxDistance: number;
  /** When nothing else matches, pick a deterministic random answer. */
  readonly luckyFallback: boolean;
  /** Relative odds of each tier for the lucky fallback. */
  readonly luckyTierWeights: Readonly<Record<AnswerTierId, number>>;
}
