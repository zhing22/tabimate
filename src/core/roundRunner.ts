// Runs the prompt rounds for the game controller: times each round, judges
// guesses, and treats time-up as submitting whatever is in the box.
import type { MatcherConfig } from '@/config/game';
import { judgeGuess, timeUpMatch } from './answering';
import type { Clock } from './clock';
import type { GameBus } from './events';
import type { GameAction } from './game';
import { createRoundTimer } from './roundTimer';
import type { Scheduler } from './scheduler';
import type { AnimalLookup, Puzzle, RunState } from './types';

export interface RoundRunnerDeps {
  readonly puzzle: Puzzle;
  readonly animals: AnimalLookup;
  readonly cfg: MatcherConfig;
  readonly clock: Clock;
  readonly scheduler: Scheduler;
  readonly roundTimeMs: number;
  readonly getState: () => RunState;
  readonly dispatch: (action: GameAction) => boolean;
  readonly emit: GameBus['emit'];
}

export function createRoundRunner(deps: RoundRunnerDeps) {
  const { puzzle, animals, cfg, roundTimeMs, getState, dispatch, emit } = deps;
  const timer = createRoundTimer(deps.scheduler);
  const now = () => deps.clock.now().getTime();

  function answered(action: GameAction) {
    if (!dispatch(action)) return;
    timer.cancel();
    const state = getState();
    const round = state.results.length - 1;
    emit('answerMatched', { round, result: state.results[round]! });
  }

  /** Time is up: whatever is in the box is the answer (see timeUpMatch). */
  function onTimeout(draft: string) {
    const prompt = puzzle.prompts[getState().results.length];
    if (!prompt) return;
    if (draft.trim() === '') {
      answered({ type: 'timeout', promptId: prompt.id, timeMs: roundTimeMs });
      return;
    }
    const match = timeUpMatch(draft, prompt, animals, cfg);
    answered({ type: 'submit', promptId: prompt.id, match, timeMs: roundTimeMs });
  }

  return {
    /**
     * Arms the timer for the round in progress, from the deadline in state. A
     * resumed round gets only the time it had left; a lapsed one times out now.
     */
    run() {
      const state = getState();
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
    },

    submit(input: string) {
      const state = getState();
      const prompt = puzzle.prompts[state.results.length];
      const endsAt = state.roundEndsAt;
      if (state.status !== 'playing' || !prompt || endsAt === null) return;
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
        emit('answerSuggested', { round, input: verdict.input, suggestion: verdict.suggestion });
      } else {
        const timeMs = Math.max(roundTimeMs - (endsAt - now()), 0);
        answered({ type: 'submit', promptId: prompt.id, match: verdict.match, timeMs });
      }
    },

    setDraft: (text: string) => timer.setDraft(text),
    cancel: () => timer.cancel(),
  };
}
