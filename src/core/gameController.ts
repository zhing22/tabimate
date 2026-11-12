import { MATCHER_CONFIG, ROUND_TIME_MS, type MatcherConfig } from '@/config/game';
import type { Clock } from './clock';
import type { GameBus } from './events';
import { canRestore, createRunState, gameReducer, type GameAction } from './game';
import { biomesEntered, totalScore } from './journey';
import { matchAnswer } from './matcher';
import type { Scheduler, TimerHandle } from './scheduler';
import type { Animal, AnimalId, GameMode, Puzzle, RunState } from './types';

export interface GameControllerDeps {
  readonly puzzle: Puzzle;
  readonly animals: ReadonlyMap<AnimalId, Animal>;
  readonly bus: GameBus;
  readonly clock: Clock;
  readonly scheduler: Scheduler;
  readonly matcherConfig?: MatcherConfig;
  readonly mode?: GameMode;
  readonly timing?: { readonly roundTimeMs: number };
}

/** The UI talks to the game only through these; it never touches state. */
export interface GameController {
  start(): void;
  submit(input: string): void;
  /**
   * Moves on from the reveal: to the next prompt, or to the results after the
   * last one. The game waits on the reveal until this is called.
   */
  next(): void;
  /** Loads a saved run into a fresh controller. False (and no change) if it doesn't fit. */
  restore(saved: RunState): boolean;
  getState(): RunState;
  /** Stops the round timer; the controller ignores calls afterwards. */
  dispose(): void;
}

export function createGameController(deps: GameControllerDeps): GameController {
  const { puzzle, animals, bus, clock, scheduler } = deps;
  const cfg = deps.matcherConfig ?? MATCHER_CONFIG;
  const mode = deps.mode ?? 'daily';
  const { roundTimeMs } = deps.timing ?? { roundTimeMs: ROUND_TIME_MS };

  let state = createRunState(puzzle, mode);
  let roundTimer: TimerHandle | null = null;
  let disposed = false;

  const now = () => clock.now().getTime();
  const nextDeadline = () => now() + roundTimeMs;

  // Listeners may call dispose() while an event is delivered (e.g. the UI
  // tearing down on the last reveal); after that the controller says nothing.
  const emit: GameBus['emit'] = (type, payload) => {
    if (!disposed) bus.emit(type, payload);
  };

  /** Applies an action; true if the state changed. */
  function dispatch(action: GameAction): boolean {
    if (disposed) return false;
    const next = gameReducer(state, action);
    if (next === state) return false;
    state = next;
    emit('stateChanged', { state });
    return true;
  }

  function cancelRoundTimer() {
    if (roundTimer !== null) scheduler.clearTimeout(roundTimer);
    roundTimer = null;
  }

  /**
   * Arms the timer for the round in progress, from the deadline in state. A
   * resumed round gets only the time it had left; a lapsed one times out now.
   */
  function runRound() {
    if (disposed) return;
    const index = state.results.length;
    const prompt = puzzle.prompts[index];
    const endsAt = state.roundEndsAt;
    if (!prompt || endsAt === null) return;
    const left = endsAt - now();
    if (left <= 0) {
      onTimeout();
      return;
    }
    roundTimer = scheduler.setTimeout(onTimeout, left);
    emit('roundStarted', { index, prompt, endsAt });
  }

  function answered(action: GameAction) {
    if (!dispatch(action)) return;
    cancelRoundTimer();
    const round = state.results.length - 1;
    emit('answerMatched', { round, result: state.results[round]! });
  }

  function finishReveal() {
    const index = state.results.length - 1;
    const scoreBefore = totalScore(state.results.slice(0, -1));
    if (!dispatch({ type: 'revealDone', nextRoundEndsAt: nextDeadline() })) return;
    emit('revealFinished', { index });
    // Biomes change after the reveal, so the tier is seen before the scene moves on.
    const score = totalScore(state.results);
    for (const biome of biomesEntered(scoreBefore, score)) emit('biomeEntered', { biome });
    if (state.status === 'finished') emit('runFinished', { results: state.results, score });
    else runRound();
  }

  function onTimeout() {
    roundTimer = null;
    const prompt = puzzle.prompts[state.results.length];
    if (!prompt) return;
    answered({ type: 'timeout', promptId: prompt.id, timeMs: roundTimeMs });
  }

  /**
   * Picks a restored run back up from wherever it was saved. A run saved
   * mid-reveal needs nothing: it waits for next(), as it did before the reload.
   */
  function resume() {
    if (state.status === 'playing') {
      runRound();
    } else if (state.status === 'finished') {
      emit('runFinished', { results: state.results, score: totalScore(state.results) });
    }
  }

  return {
    start() {
      if (!dispatch({ type: 'start', roundEndsAt: nextDeadline() })) return;
      emit('runStarted', { mode, puzzleDate: puzzle.date, promptCount: state.promptCount });
      runRound();
    },

    submit(input) {
      if (disposed || state.status !== 'playing') return;
      const prompt = puzzle.prompts[state.results.length];
      const endsAt = state.roundEndsAt;
      if (!prompt || endsAt === null) return;
      // Background tabs delay timers, so an answer can arrive after the deadline
      // before the timeout has fired. It is a timeout all the same.
      if (now() >= endsAt) {
        cancelRoundTimer();
        onTimeout();
        return;
      }
      const match = matchAnswer(input, prompt, animals, cfg);
      const timeMs = Math.max(roundTimeMs - (endsAt - now()), 0);
      answered({ type: 'submit', promptId: prompt.id, match, timeMs });
    },

    next() {
      // dispatch ignores revealDone in any other status, and after dispose.
      finishReveal();
    },

    restore(saved) {
      if (disposed || state.status !== 'idle' || !canRestore(saved, puzzle, mode)) return false;
      if (!dispatch({ type: 'restore', state: saved })) return false;
      emit('runRestored', { state });
      resume();
      return true;
    },

    getState: () => state,

    dispose() {
      cancelRoundTimer();
      disposed = true;
    },
  };
}
