// Whether a saved run fits a puzzle (restore), and whether one run may replace
// another on disk (two tabs, a reload). Pure.
import { bonusFits, bonusProgress, sameBonusResults } from './bonus';
import type { GameMode, MatchResult, Puzzle, RoundResult, RunState, RunStatus } from './types';

// How many results each status allows, for a run of n prompts.
const RESULTS_FIT: Readonly<Record<RunStatus, (done: number, n: number) => boolean>> = {
  // Nothing to resume: restoring it would leave the page waiting for a start
  // that never comes. The app never saves idle; only an old or edited save has it.
  idle: () => false,
  playing: (done, n) => done < n,
  revealing: (done) => done >= 1,
  bonus: (done, n) => done === n,
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
  return (
    inOrder &&
    deadlineFits &&
    RESULTS_FIT[saved.status](saved.results.length, n) &&
    bonusFits(saved, puzzle.bonus?.length ?? 0)
  );
}

// Order of statuses for the same number of results: a round is revealed, then
// the next one is played (playing(n) comes after revealing(n)). The bonus quiz
// comes after the last reveal: it can never share a result count with playing.
const STATUS_RANK: Readonly<Record<RunStatus, number>> = {
  idle: 0,
  revealing: 1,
  playing: 2,
  bonus: 2,
  finished: 3,
};

/** How far through a run a state is; grows with every transition, bonus steps included. */
export const runProgress = (state: RunState): number =>
  (state.results.length * 4 + STATUS_RANK[state.status]) * 100 + bonusProgress(state);

const sameMatch = (a: MatchResult, b: MatchResult): boolean =>
  a.level === b.level &&
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
  if (!sameBonusResults(saved.bonusResults, next.bonusResults)) return false;
  const ahead = runProgress(next) - runProgress(saved);
  if (ahead !== 0) return ahead > 0;
  return (
    next.status === saved.status &&
    next.roundEndsAt === saved.roundEndsAt &&
    next.bonusEndsAt === saved.bonusEndsAt
  );
}
