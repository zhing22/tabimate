import { MATCHER_CONFIG, ROUND_TIME_MS } from '@/config/game';
import { createBonusRunner } from './bonusRunner';
import type { GameController, GameControllerDeps } from './controllerTypes';
import type { GameBus } from './events';
import { canRestore, createRunState, gameReducer, type GameAction } from './game';
import { biomesEntered } from './journey';
import { createRoundRunner } from './roundRunner';
import { baseTotal, runTotals } from './scoring';

export type { GameController, GameControllerDeps } from './controllerTypes';

/**
 * The game for one puzzle: the state machine (game.ts) driven by the player
 * and the clock, telling the UI and scene what happens on the bus. Rounds and
 * the bonus quiz each have a runner; this wires them and moves between them.
 */
export function createGameController(deps: GameControllerDeps): GameController {
  const { puzzle, clock, scheduler } = deps;
  const mode = deps.mode ?? 'daily';
  const roundTimeMs = deps.timing?.roundTimeMs ?? ROUND_TIME_MS;

  let state = createRunState(puzzle, mode);
  let disposed = false;
  const now = () => clock.now().getTime();

  // Listeners may call dispose() while an event is delivered (e.g. the UI
  // tearing down on the last reveal); after that the controller says nothing.
  const emit: GameBus['emit'] = (type, payload) => {
    if (!disposed) deps.bus.emit(type, payload);
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

  const emitFinished = () => emit('runFinished', runTotals(state));
  const shared = { puzzle, clock, scheduler, getState: () => state, dispatch, emit };
  const rounds = createRoundRunner({
    ...shared,
    animals: deps.animals,
    cfg: deps.matcherConfig ?? MATCHER_CONFIG,
    roundTimeMs,
  });
  const bonus = createBonusRunner({
    ...shared,
    finished: emitFinished,
    ...(deps.timing?.bonusQuestionMs ? { questionMs: deps.timing.bonusQuestionMs } : {}),
  });

  function finishReveal() {
    const index = state.results.length - 1;
    const before = baseTotal(state.results.slice(0, -1));
    if (!dispatch({ type: 'revealDone', nextRoundEndsAt: now() + roundTimeMs })) return;
    emit('revealFinished', { index });
    if (disposed) return; // a listener tore the game down: start nothing more
    // Biomes change after the reveal, so the level is seen before the scene moves on.
    for (const biome of biomesEntered(before, baseTotal(state.results))) {
      emit('biomeEntered', { biome });
    }
    if (state.status === 'finished') emitFinished();
    else if (state.status === 'bonus') bonus.enter();
    else rounds.run();
  }

  /**
   * Picks a restored run back up from wherever it was saved. A run saved
   * mid-reveal needs nothing: it waits for next(), as it did before the reload.
   */
  function resume() {
    if (state.status === 'playing') rounds.run();
    else if (state.status === 'bonus') bonus.resume();
    else if (state.status === 'finished') emitFinished();
  }

  return {
    start() {
      if (!dispatch({ type: 'start', roundEndsAt: now() + roundTimeMs })) return;
      emit('runStarted', { mode, puzzleDate: puzzle.date, promptCount: state.promptCount });
      rounds.run();
    },

    submit(input) {
      if (!disposed) rounds.submit(input);
    },

    setDraft: (text) => rounds.setDraft(text),

    next() {
      // dispatch ignores an action that doesn't fit the status, and after dispose.
      if (state.status === 'bonus') bonus.next();
      else finishReveal();
    },

    answerBonus: (value) => bonus.answer(value),

    restore(saved) {
      if (disposed || state.status !== 'idle' || !canRestore(saved, puzzle, mode)) return false;
      if (!dispatch({ type: 'restore', state: saved })) return false;
      emit('runRestored', { state });
      resume();
      return true;
    },

    getState: () => state,

    dispose() {
      rounds.cancel();
      bonus.dispose();
      disposed = true;
    },
  };
}
