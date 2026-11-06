import type { MatcherConfig } from '@/core/types';

/** Daily reset happens at 00:00 in this zone. */
export const TIMEZONE = 'Asia/Singapore';

/** MVP value; planned to become 7. */
export const PROMPTS_PER_DAY = 3;

export const ROUND_TIME_MS = 25_000;

/** Pause between a submitted answer and the tier reveal, for suspense. */
export const REVEAL_DELAY_MS = 600;

export const MATCHER_CONFIG = {
  // Low on purpose: matching is meant to be loose (see CLAUDE.md).
  minSimilarity: 0.3,
  typoMaxDistance: 2,
  luckyFallback: true,
  // Lucky hits should mostly be common animals, so a rare tier still feels earned.
  luckyTierWeights: { 1: 50, 2: 25, 3: 13, 4: 8, 5: 4 },
} as const satisfies MatcherConfig;
