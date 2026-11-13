import { MATCHER_CONFIG, ROUND_TIME_MS } from '@/config/game';
import type { GameBus } from './events';
import { canRestore, createRunState, gameReducer, type GameAction } from './game';
import { biomesEntered, totalScore } from './journey';
import { judgeGuess, timeUpMatch } from './answering';
import type { GameController, GameControllerDeps } from './controllerTypes';
import { createRoundTimer } from './roundTimer';

export type { GameController, GameControllerDeps } from './controllerTypes';

export function createGameController(deps: GameControllerDeps): GameController {
  const { puzzle, animals, bus, clock, scheduler } = deps;
  const cfg = deps.matcherConfig ?? MATCHER_CONFIG;
  const mode = deps.mode ?? 'daily';
  const { roundTimeMs } = deps.timing ?? { roundTimeMs: ROUND_TIME_MS };

  let state = createRunState(puzzle, mode);
  const timer = createRoundTimer(scheduler);
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
      onTimeout('');
      return;
    }
    timer.start(left, onTimeout);
    emit('roundStarted', { index, prompt, endsAt });
  }

  function answered(action: GameAction) {
    if (!dispatch(action)) return;
    timer.cancel();
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

  /** Time is up: whatever is in the box is the answer (see timeUpMatch). */
  function onTimeout(draft: string) {
    const prompt = puzzle.prompts[state.results.length];
    if (!prompt) return;
    if (draft.trim() === '') {
      answered({ type: 'timeout', promptId: prompt.id, timeMs: roundTimeMs });
      return;
    }
    const match = timeUpMatch(draft, prompt, animals, cfg);
    answered({ type: 'submit', promptId: prompt.id, match, timeMs: roundTimeMs });
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
      // before the timeout has fired. Time ran out with this text in the box.
      if (now() >= endsAt) {
        timer.cancel();
        onTimeout(input);
        return;
      }
      const verdict = judgeGuess(input, prompt, animals, cfg);
      const round = state.results.length;
      if (verdict.kind === 'none') {
        emit('answerRejected', { round, input: verdict.input });
      } else if (verdict.kind === 'close') {
        const { suggestion } = verdict;
        emit('answerSuggested', { round, input: verdict.input, suggestion });
      } else {
        const timeMs = Math.max(roundTimeMs - (endsAt - now()), 0);
        answered({ type: 'submit', promptId: prompt.id, match: verdict.match, timeMs });
      }
    },

    setDraft: (text) => timer.setDraft(text),

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
      timer.cancel();
      disposed = true;
    },
  };
}
