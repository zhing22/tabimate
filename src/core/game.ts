import type {
  GameMode,
  MatchResult,
  PromptId,
  Puzzle,
  RoundResult,
  RunState,
  RunStatus,
} from './types';

export type GameAction =
  | { readonly type: 'start' }
  | {
      readonly type: 'submit';
      readonly promptId: PromptId;
      readonly match: MatchResult;
      readonly timeMs: number;
    }
  | { readonly type: 'timeout'; readonly promptId: PromptId; readonly timeMs: number }
  | { readonly type: 'revealDone' }
  | { readonly type: 'restore'; readonly state: RunState };

/** A fresh, not yet started run of `puzzle`. */
export function createRunState(puzzle: Puzzle, mode: GameMode = 'daily'): RunState {
  return {
    mode,
    puzzleDate: puzzle.date,
    promptCount: puzzle.prompts.length,
    results: [],
    status: 'idle',
  };
}

/** Index of the round being played or revealed; null when idle or finished. */
export function currentRoundIndex(state: RunState): number | null {
  if (state.status === 'playing') return state.results.length;
  if (state.status === 'revealing') return state.results.length - 1;
  return null;
}

const timedOut = (): MatchResult => ({ tier: 0, animalId: null, strategy: null, input: '' });

function answer(state: RunState, result: RoundResult): RunState {
  if (state.status !== 'playing' || state.results.length >= state.promptCount) return state;
  return { ...state, status: 'revealing', results: [...state.results, result] };
}

/**
 * The only way a run changes. Illegal actions for the current status return
 * the same state object, so callers can tell nothing happened.
 */
export function gameReducer(state: RunState, action: GameAction): RunState {
  switch (action.type) {
    case 'start':
      return state.status === 'idle' ? { ...state, status: 'playing' } : state;
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
      return {
        ...state,
        status: state.results.length >= state.promptCount ? 'finished' : 'playing',
      };
    case 'restore':
      return state.status === 'idle' ? action.state : state;
  }
}

// How many results each status allows, for a run of n prompts.
const RESULTS_FIT: Readonly<Record<RunStatus, (done: number, n: number) => boolean>> = {
  idle: (done) => done === 0,
  playing: (done, n) => done < n,
  revealing: (done) => done >= 1,
  finished: (done, n) => done === n,
};

/**
 * True if `saved` is a consistent run of this puzzle in this mode: same date
 * and prompt count, results in prompt order, and a status that fits them.
 */
export function canRestore(saved: RunState, puzzle: Puzzle, mode: GameMode): boolean {
  const n = puzzle.prompts.length;
  if (saved.mode !== mode || saved.puzzleDate !== puzzle.date || saved.promptCount !== n) {
    return false;
  }
  if (saved.results.length > n) return false;
  const inOrder = saved.results.every((r, i) => r.promptId === puzzle.prompts[i]?.id);
  return inOrder && RESULTS_FIT[saved.status](saved.results.length, n);
}
