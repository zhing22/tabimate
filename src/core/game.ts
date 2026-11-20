import { bonusReducer, type BonusAction } from './bonus';
import type { GameMode, MatchResult, PromptId, Puzzle, RoundResult, RunState } from './types';

// start and revealDone carry the next round's deadline, so a playing state is
// never without one (a save taken at any moment can be resumed fairly).
export type GameAction =
  | { readonly type: 'start'; readonly roundEndsAt: number }
  | {
      readonly type: 'submit';
      readonly promptId: PromptId;
      readonly match: MatchResult;
      readonly timeMs: number;
    }
  | { readonly type: 'timeout'; readonly promptId: PromptId; readonly timeMs: number }
  | { readonly type: 'revealDone'; readonly nextRoundEndsAt: number }
  | { readonly type: 'restore'; readonly state: RunState }
  | BonusAction;

/** A fresh, not yet started run of `puzzle`. */
export function createRunState(puzzle: Puzzle, mode: GameMode = 'daily'): RunState {
  return {
    mode,
    puzzleDate: puzzle.date,
    promptCount: puzzle.prompts.length,
    results: [],
    status: 'idle',
    roundEndsAt: null,
    bonusCount: puzzle.bonus?.length ?? 0,
    bonusResults: [],
    bonusEndsAt: null,
  };
}

/** Index of the round being played or revealed; null when idle or finished. */
export function currentRoundIndex(state: RunState): number | null {
  if (state.status === 'playing') return state.results.length;
  if (state.status === 'revealing') return state.results.length - 1;
  return null;
}

const timedOut = (): MatchResult => ({ level: 0, animalId: null, strategy: null, input: '' });

function answer(state: RunState, result: RoundResult): RunState {
  if (state.status !== 'playing' || state.results.length >= state.promptCount) return state;
  return {
    ...state,
    status: 'revealing',
    results: [...state.results, result],
    roundEndsAt: null,
  };
}

/**
 * The only way a run changes. Illegal actions for the current status return
 * the same state object, so callers can tell nothing happened.
 */
export function gameReducer(state: RunState, action: GameAction): RunState {
  switch (action.type) {
    case 'start':
      if (state.status !== 'idle') return state;
      return { ...state, status: 'playing', roundEndsAt: action.roundEndsAt };
    case 'submit':
      return answer(state, {
        promptId: action.promptId,
        match: action.match,
        timeMs: action.timeMs,
      });
    case 'timeout':
      return answer(state, { promptId: action.promptId, match: timedOut(), timeMs: action.timeMs });
    case 'revealDone':
      if (state.status !== 'revealing') return state;
      if (state.results.length < state.promptCount) {
        return { ...state, status: 'playing', roundEndsAt: action.nextRoundEndsAt };
      }
      // After the last prompt: the bonus quiz if the day has one, else the end.
      return { ...state, status: state.bonusCount > 0 ? 'bonus' : 'finished', roundEndsAt: null };
    case 'restore':
      return state.status === 'idle' ? action.state : state;
    case 'bonusNext':
    case 'bonusAnswer':
      return bonusReducer(state, action);
  }
}

export { canOverwrite, canRestore, runProgress } from './runChecks';
