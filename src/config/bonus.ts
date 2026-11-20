// The Sunday Deep Dive bonus quiz (config/themes.ts bonusQuiz).
/**
 * The bonus quiz on a bonusQuiz day (config/themes.ts): true-or-false questions
 * after the last prompt. Each right answer adds `step` to the day multiplier,
 * up to `maxMultiplier`; single answers still score at most 100.
 */
export const BONUS = {
  questions: 3,
  questionMs: 10_000,
  step: 0.1,
  maxMultiplier: 1.3,
  /** An explanation's length limit, in words. */
  explanationWords: 15,
} as const;
