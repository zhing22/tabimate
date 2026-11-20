// The bonus quiz phase of a run (status 'bonus'): after the last prompt's
// reveal on a quiz day, a few timed true-or-false questions, each followed by
// its explanation. Pure; game.ts routes the bonus actions here.
import type { BonusResult, RunState } from './types';

export type BonusAction =
  /** Starts the next question with its deadline, or finishes after the last one. */
  | { readonly type: 'bonusNext'; readonly endsAt: number }
  /** An answer, or a timeout (answer null), to the current question. */
  | {
      readonly type: 'bonusAnswer';
      readonly answer: boolean | null;
      readonly correct: boolean;
      readonly timeMs: number;
    };

/** Index of the question being asked or explained; null outside the quiz. */
export function currentBonusIndex(state: RunState): number | null {
  if (state.status !== 'bonus') return null;
  return state.bonusEndsAt === null ? state.bonusResults.length - 1 : state.bonusResults.length;
}

export function bonusReducer(state: RunState, action: BonusAction): RunState {
  if (state.status !== 'bonus') return state;
  const answered = state.bonusResults.length;
  switch (action.type) {
    case 'bonusNext':
      if (state.bonusEndsAt !== null) return state; // a question is still open
      return answered >= state.bonusCount
        ? { ...state, status: 'finished' }
        : { ...state, bonusEndsAt: action.endsAt };
    case 'bonusAnswer': {
      if (state.bonusEndsAt === null || answered >= state.bonusCount) return state;
      const result: BonusResult = {
        answer: action.answer,
        correct: action.correct,
        timeMs: action.timeMs,
      };
      return { ...state, bonusResults: [...state.bonusResults, result], bonusEndsAt: null };
    }
  }
}

/** Whether a saved run's bonus fields fit its status and its puzzle's quiz. */
export function bonusFits(saved: RunState, bonusCount: number): boolean {
  if (saved.bonusCount !== bonusCount || saved.bonusResults.length > bonusCount) return false;
  const open = saved.bonusEndsAt !== null;
  if (saved.status === 'bonus') {
    return !open || (Number.isFinite(saved.bonusEndsAt) && saved.bonusResults.length < bonusCount);
  }
  if (open) return false;
  return saved.status === 'finished'
    ? saved.bonusResults.length === bonusCount
    : saved.bonusResults.length === 0;
}

/** Steps through the quiz: 2 per question (asked, then explained). */
export const bonusProgress = (state: RunState): number =>
  state.bonusResults.length * 2 + (state.bonusEndsAt === null ? 0 : 1);

export const sameBonusResults = (a: readonly BonusResult[], b: readonly BonusResult[]): boolean =>
  a.every((r, i) => {
    const o = b[i];
    return (
      o !== undefined && o.answer === r.answer && o.correct === r.correct && o.timeMs === r.timeMs
    );
  });
