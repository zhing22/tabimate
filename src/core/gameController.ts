import { MATCHER_CONFIG, REVEAL_DELAY_MS, ROUND_TIME_MS, type MatcherConfig } from '@/config/game';
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
  readonly timing?: { readonly roundTimeMs: number; readonly revealDelayMs: number };
}

/** The UI talks to the game only through these; it never touches state. */
export interface GameController {
  start(): void;
  submit(input: string): void;
  /** Loads a saved run into a fresh controller. False (and no change) if it doesn't fit. */
  restore(saved: RunState): boolean;
  getState(): RunState;
  /** Stops all timers; the controller ignores calls afterwards. */
  dispose(): void;
}

export function createGameController(deps: GameControllerDeps): GameController {
  const { puzzle, animals, bus, clock, scheduler } = deps;
  const cfg = deps.matcherConfig ?? MATCHER_CONFIG;
  const mode = deps.mode ?? 'daily';
  const { roundTimeMs, revealDelayMs } = deps.timing ?? {
    roundTimeMs: ROUND_TIME_MS,
    revealDelayMs: REVEAL_DELAY_MS,
  };

  let state = createRunState(puzzle, mode);
  let roundTimer: TimerHandle | null = null;
  let revealTimer: TimerHandle | null = null;
  let roundStartedAt = 0;
  let disposed = false;

  const now = () => clock.now().getTime();

  /** Applies an action; true if the state changed. */
  function dispatch(action: GameAction): boolean {
    if (disposed) return false;
    const next = gameReducer(state, action);
    if (next === state) return false;
    state = next;
    bus.emit('stateChanged', { state });
    return true;
  }

  function cancelRoundTimer() {
    if (roundTimer !== null) scheduler.clearTimeout(roundTimer);
    roundTimer = null;
  }

  function beginRound() {
    const index = state.results.length;
    const prompt = puzzle.prompts[index];
    if (!prompt) return;
    roundStartedAt = now();
    roundTimer = scheduler.setTimeout(onTimeout, roundTimeMs);
    bus.emit('roundStarted', { index, prompt, endsAt: roundStartedAt + roundTimeMs });
  }

  function scheduleReveal(scoreBefore: number) {
    revealTimer = scheduler.setTimeout(() => finishReveal(scoreBefore), revealDelayMs);
  }

  function answered(action: GameAction, scoreBefore: number) {
    if (!dispatch(action)) return;
    cancelRoundTimer();
    const round = state.results.length - 1;
    bus.emit('answerMatched', { round, result: state.results[round]! });
    scheduleReveal(scoreBefore);
  }

  function finishReveal(scoreBefore: number) {
    revealTimer = null;
    const index = state.results.length - 1;
    if (!dispatch({ type: 'revealDone' })) return;
    bus.emit('revealFinished', { index });
    // Biomes change after the reveal, so the tier is seen before the scene moves on.
    const score = totalScore(state.results);
    for (const biome of biomesEntered(scoreBefore, score)) bus.emit('biomeEntered', { biome });
    if (state.status === 'finished') bus.emit('runFinished', { results: state.results, score });
    else beginRound();
  }

  function onTimeout() {
    roundTimer = null;
    const prompt = puzzle.prompts[state.results.length];
    if (!prompt) return;
    const scoreBefore = totalScore(state.results);
    answered({ type: 'timeout', promptId: prompt.id, timeMs: roundTimeMs }, scoreBefore);
  }

  /** Picks a restored run back up from wherever it was saved. */
  function resume() {
    if (state.status === 'playing') {
      // The saved state has no round start time, so the round restarts with a full timer.
      beginRound();
    } else if (state.status === 'revealing') {
      scheduleReveal(totalScore(state.results.slice(0, -1)));
    } else if (state.status === 'finished') {
      bus.emit('runFinished', { results: state.results, score: totalScore(state.results) });
    }
  }

  return {
    start() {
      if (!dispatch({ type: 'start' })) return;
      bus.emit('runStarted', { mode, puzzleDate: puzzle.date, promptCount: state.promptCount });
      beginRound();
    },

    submit(input) {
      if (disposed || state.status !== 'playing') return;
      const prompt = puzzle.prompts[state.results.length];
      if (!prompt) return;
      const match = matchAnswer(input, prompt, animals, cfg);
      const timeMs = Math.min(Math.max(now() - roundStartedAt, 0), roundTimeMs);
      answered({ type: 'submit', promptId: prompt.id, match, timeMs }, totalScore(state.results));
    },

    restore(saved) {
      if (disposed || state.status !== 'idle' || !canRestore(saved, puzzle, mode)) return false;
      if (!dispatch({ type: 'restore', state: saved })) return false;
      bus.emit('runRestored', { state });
      resume();
      return true;
    },

    getState: () => state,

    dispose() {
      cancelRoundTimer();
      if (revealTimer !== null) scheduler.clearTimeout(revealTimer);
      revealTimer = null;
      disposed = true;
    },
  };
}
