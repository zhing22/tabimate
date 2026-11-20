// The bonus quiz's data and answers (see core/bonus.ts).
/** One true-or-false bonus question (public/data/bonus/{date}.json). */
export interface BonusItem {
  readonly statement: string;
  readonly answer: boolean;
  /** Shown after the player answers: 15 words or fewer. */
  readonly explanation: string;
}

/** How the player answered one bonus question. */
export interface BonusResult {
  /** True or false; null when time ran out (counts as wrong). */
  readonly answer: boolean | null;
  /** Decided when answered, so the saved run never needs the quiz file to score. */
  readonly correct: boolean;
  readonly timeMs: number;
}
