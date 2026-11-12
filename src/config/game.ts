/** Zone whose wall clock decides when a new puzzle starts. */
export const TIMEZONE = 'Asia/Singapore';

/**
 * Local hour (0–23, in TIMEZONE) when a new puzzle starts. 12 = noon, so
 * 00:00–11:59 still belongs to the previous date's puzzle.
 */
export const RESET_HOUR = 12;

/** DateKey of puzzle #1. */
export const LAUNCH_DATE_KEY = '2026-11-06';

/**
 * How many prompts new puzzles are written with. MVP value; planned to become 7.
 * The game plays however many prompts a puzzle file has, so raising this does
 * not invalidate puzzles already shipped.
 */
export const PROMPTS_PER_DAY = 3;

/** Most prompts a puzzle file may have. Validation accepts 1 up to this. */
export const MAX_PROMPTS_PER_PUZZLE = 7;

export const ROUND_TIME_MS = 25_000;

/** With this much of a round left (or less), the timer ring turns urgent. */
export const TIMER_WARN_MS = 5_000;

/**
 * Drum-roll before the tier appears on the reveal. The reveal then stays up
 * until the player taps Next (or presses Enter); the next timer starts then.
 */
export const REVEAL_SUSPENSE_MS = 600;

/** Journey distance (world units, scaled by the scene) the player moves per point. */
export const DISTANCE_PER_POINT = 1;

/**
 * Longest guess the matcher reads; anything after is cut off. Also the input
 * box's maxlength, so every animal name (validated against it) can be typed.
 */
export const MAX_INPUT_LENGTH = 40;

/** Days of full run state kept in storage (history keeps scores for every day). */
export const RUNS_KEPT_DAYS = 7;

export interface MatcherConfig {
  /** Trigram similarity (0..1) the 'loose' strategy needs to accept a hit. */
  readonly minSimilarity: number;
  /**
   * Trigrams of three real letters (no padding or space) a guess must share with
   * a name for 'loose'. Stops "dog" -> "dolphin", which share only the word start.
   */
  readonly looseMinInnerGrams: number;
  /** Most Levenshtein edits the 'typo' strategy ever accepts. */
  readonly typoMaxDistance: number;
  /** Shortest guess and name 'typo' considers. */
  readonly typoMinLength: number;
  /**
   * Edits allowed as a share of the name's length, rounded down but at least 1,
   * so short names tolerate fewer: 4-6 letters get 1 edit, 7+ get 2 (the max).
   */
  readonly typoMaxShare: number;
  /** Shortest text 'partial' will treat as part of a name, in either direction. */
  readonly partialMinLength: number;
  /**
   * Least share (0..1) of the longer string the shorter must cover for 'partial',
   * so "sea" alone does not count as "sea otter".
   */
  readonly partialMinCoverage: number;
}

export const MATCHER_CONFIG = {
  // Low on purpose: matching is meant to be loose (see CLAUDE.md).
  minSimilarity: 0.3,
  looseMinInnerGrams: 2,
  typoMaxDistance: 2,
  typoMinLength: 4,
  typoMaxShare: 0.3,
  partialMinLength: 3,
  partialMinCoverage: 0.4,
} as const satisfies MatcherConfig;
