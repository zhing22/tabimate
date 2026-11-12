import type {
  GameMode,
  MatchResult,
  PromptId,
  Puzzle,
  RoundResult,
  RunState,
  RunStatus,
} from './types';

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
  | { readonly type: 'restore'; readonly state: RunState };

/** A fresh, not yet started run of `puzzle`. */
export function createRunState(puzzle: Puzzle, mode: GameMode = 'daily'): RunState {
  return {
    mode,
    puzzleDate: puzzle.date,
    promptCount: puzzle.prompts.length,
    results: [],
    status: 'idle',
    roundEndsAt: null,
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
      return state.results.length >= state.promptCount
        ? { ...state, status: 'finished', roundEndsAt: null }
        : { ...state, status: 'playing', roundEndsAt: action.nextRoundEndsAt };
    case 'restore':
      return state.status === 'idle' ? action.state : state;
  }
}

// How many results each status allows, for a run of n prompts.
const RESULTS_FIT: Readonly<Record<RunStatus, (done: number, n: number) => boolean>> = {
  // Nothing to resume: restoring it would leave the page waiting for a start
  // that never comes. The app never saves idle; only an old or edited save has it.
  idle: () => false,
  playing: (done, n) => done < n,
  revealing: (done) => done >= 1,
  finished: (done, n) => done === n,
};

/**
 * True if `saved` is a consistent run of this puzzle in this mode: same date
 * and prompt count, results in prompt order, and a status that fits them.
 * An idle run never is: there is nothing to pick up.
 * A playing run must have its round deadline; no other status may.
 */
export function canRestore(saved: RunState, puzzle: Puzzle, mode: GameMode): boolean {
  const n = puzzle.prompts.length;
  if (saved.mode !== mode || saved.puzzleDate !== puzzle.date || saved.promptCount !== n) {
    return false;
  }
  if (saved.results.length > n) return false;
  const inOrder = saved.results.every((r, i) => r.promptId === puzzle.prompts[i]?.id);
  const deadlineFits =
    saved.status === 'playing'
      ? typeof saved.roundEndsAt === 'number' && Number.isFinite(saved.roundEndsAt)
      : saved.roundEndsAt === null;
  return inOrder && deadlineFits && RESULTS_FIT[saved.status](saved.results.length, n);
}

// Order of statuses for the same number of results: a round is revealed, then
// the next one is played (playing(n) comes after revealing(n)).
const STATUS_RANK: Readonly<Record<RunStatus, number>> = {
  idle: 0,
  revealing: 1,
  playing: 2,
  finished: 3,
};

/** How far through a run a state is; grows with every transition. */
export const runProgress = (state: RunState): number =>
  state.results.length * 4 + STATUS_RANK[state.status];

const sameMatch = (a: MatchResult, b: MatchResult): boolean =>
  a.tier === b.tier &&
  a.animalId === b.animalId &&
  a.strategy === b.strategy &&
  a.input === b.input;

const sameResult = (a: RoundResult, b: RoundResult): boolean =>
  a.promptId === b.promptId && a.timeMs === b.timeMs && sameMatch(a.match, b.match);

/**
 * True if `next` may replace `saved` on disk. It must be the same run carried
 * further: same day, every saved answer unchanged and in place, and not behind.
 * At the same point it must be identical (deadline included). A finished run
 * is final. Without the answer check, a second tab could answer a round again
 * and replace the first answer: a free retry.
 */
export function canOverwrite(saved: RunState, next: RunState): boolean {
  if (saved.puzzleDate !== next.puzzleDate || saved.mode !== next.mode) return false;
  if (saved.status === 'finished') return false;
  if (next.results.length < saved.results.length) return false;
  if (!saved.results.every((result, i) => sameResult(result, next.results[i]!))) return false;
  const ahead = runProgress(next) - runProgress(saved);
  if (ahead !== 0) return ahead > 0;
  return next.status === saved.status && next.roundEndsAt === saved.roundEndsAt;
}
