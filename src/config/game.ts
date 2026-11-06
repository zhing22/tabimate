import type { AnswerTierId } from './tiers';

/** Zone whose wall clock decides when a new puzzle starts. */
export const TIMEZONE = 'Asia/Singapore';

/**
 * Local hour (0–23, in TIMEZONE) when a new puzzle starts. 12 = noon, so
 * 00:00–11:59 still belongs to the previous date's puzzle.
 */
export const RESET_HOUR = 12;

/** DateKey of puzzle #1. */
export const LAUNCH_DATE_KEY = '2026-11-06';

/** MVP value; planned to become 7. */
export const PROMPTS_PER_DAY = 3;

export const ROUND_TIME_MS = 25_000;

/** Pause between a submitted answer and the tier reveal, for suspense. */
export const REVEAL_DELAY_MS = 600;

export interface MatcherConfig {
  /** Trigram similarity (0..1) the 'loose' strategy needs to accept a hit. */
  readonly minSimilarity: number;
  /** Max Levenshtein distance the 'typo' strategy accepts. */
  readonly typoMaxDistance: number;
  /**
   * Chance (0..1) that a guess resembling no answer still gets a deterministic
   * lucky answer; otherwise it scores tier 0. Set to 0 to turn lucky off.
   */
  readonly luckyHitChance: number;
  /** Relative odds of each tier when the lucky roll hits. 0 = never. */
  readonly luckyTierWeights: Readonly<Record<AnswerTierId, number>>;
}

export const MATCHER_CONFIG = {
  // Low on purpose: matching is meant to be loose (see CLAUDE.md).
  minSimilarity: 0.3,
  typoMaxDistance: 2,
  // Most unrecognised guesses miss, so a lucky find stays a surprise.
  luckyHitChance: 0.2,
  // Critically Endangered is never handed out by luck; it has to be named.
  luckyTierWeights: { 1: 20, 2: 30, 3: 35, 4: 15, 5: 0 },
} as const satisfies MatcherConfig;
