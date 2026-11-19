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
 * First puzzle written under the v2 level rules (exactly one CR per prompt,
 * groups). Earlier puzzles were already played, so they keep their original
 * answers and levels; the validator only checks their shape.
 */
export const LEVEL_RULES_FROM = '2026-11-19';

/**
 * How many prompts a day has. The game plays however many prompts a puzzle
 * file has, so older 3-prompt days still play as written.
 */
export const PROMPTS_PER_DAY = 7;

/**
 * First day that must have exactly PROMPTS_PER_DAY prompts. Earlier files
 * (the 3-prompt MVP days) are only held to 1..MAX_PROMPTS_PER_PUZZLE.
 */
export const FULL_LENGTH_FROM = '2026-11-25';

/** Most prompts a puzzle file may have. */
export const MAX_PROMPTS_PER_PUZZLE = 7;

export const ROUND_TIME_MS = 25_000;

/** With this much of a round left (or less), the timer ring turns urgent. */
export const TIMER_WARN_MS = 5_000;

/**
 * The reveal's beats: a drum-roll (longer for rarer levels), the level badge
 * popping in, then the animal's name. The reveal then stays up until the
 * player taps Next (or presses Enter); the next timer starts then.
 */
export interface RevealTiming {
  /** Drum-roll before any level shows. */
  readonly suspenseMs: number;
  /** Extra drum-roll per level above 0, so a Critically Endangered find builds up most. */
  readonly perLevelMs: number;
  /** The badge's scale-and-overshoot pop. */
  readonly badgePopMs: number;
  /** From the badge appearing to the animal's name appearing. */
  readonly nameDelayMs: number;
}

export const REVEAL_TIMING: RevealTiming = {
  suspenseMs: 600,
  perLevelMs: 150,
  badgePopMs: 420,
  nameDelayMs: 350,
};

/** Everything happens at once: for tests, and anything that wants no ceremony. */
export const INSTANT_REVEAL: RevealTiming = {
  suspenseMs: 0,
  perLevelMs: 0,
  badgePopMs: 0,
  nameDelayMs: 0,
};

/** How long the drum-roll lasts before a level's badge appears. The audio uses it too. */
export const revealBuildUpMs = (level: number, timing: RevealTiming = REVEAL_TIMING): number =>
  timing.suspenseMs + Math.max(0, level) * timing.perLevelMs;

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
