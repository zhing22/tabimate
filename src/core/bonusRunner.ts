// Runs the bonus quiz for the game controller: times each question, judges
// the answer against the puzzle's quiz, and says what happened on the bus.
import { BONUS } from '@/config/bonus';
import type { Clock } from './clock';
import type { GameBus } from './events';
import type { GameAction } from './game';
import { currentBonusIndex } from './bonus';
import { createRoundTimer } from './roundTimer';
import type { Scheduler } from './scheduler';
import type { Puzzle, RunState } from './types';

export interface BonusRunnerDeps {
  readonly puzzle: Puzzle;
  readonly clock: Clock;
  readonly scheduler: Scheduler;
  readonly questionMs?: number;
  readonly getState: () => RunState;
  /** Applies an action; true if the state changed. */
  readonly dispatch: (action: GameAction) => boolean;
  readonly emit: GameBus['emit'];
  /** The quiz is over (the run is finished). */
  readonly finished: () => void;
}

export interface BonusRunner {
  /** The run just reached the quiz: show its intro. */
  enter(): void;
  /** The player's answer to the open question. */
  answer(value: boolean): void;
  /** Moves on: from the intro or an explanation to the next question, or to the end. */
  next(): void;
  /** Picks a restored run back up inside the quiz. */
  resume(): void;
  dispose(): void;
}

export function createBonusRunner(deps: BonusRunnerDeps): BonusRunner {
  const { puzzle, getState, dispatch, emit } = deps;
  const questionMs = deps.questionMs ?? BONUS.questionMs;
  const timer = createRoundTimer(deps.scheduler);
  const now = () => deps.clock.now().getTime();
  const itemAt = (index: number) => puzzle.bonus?.[index];

  /** Judges the open question; a timeout (null) is always wrong. */
  function settle(given: boolean | null) {
    const state = getState();
    const endsAt = state.bonusEndsAt;
    const index = currentBonusIndex(state);
    const item = index === null ? undefined : itemAt(index);
    if (index === null || endsAt === null || !item) return;
    // Background tabs delay timers, so an answer can arrive after the deadline
    // before the timeout has fired (time to look it up elsewhere): it is a timeout.
    const value = now() >= endsAt ? null : given;
    const timeMs = Math.min(questionMs, Math.max(0, questionMs - (endsAt - now())));
    const correct = value !== null && value === item.answer;
    if (!dispatch({ type: 'bonusAnswer', answer: value, correct, timeMs })) return;
    timer.cancel();
    const result = getState().bonusResults[index]!;
    emit('bonusAnswered', { index, total: state.bonusCount, item, result });
  }

  /** Arms the open question's timer from the deadline in state (a reload keeps what was left). */
  function ask() {
    const state = getState();
    const index = currentBonusIndex(state);
    const item = index === null ? undefined : itemAt(index);
    const endsAt = state.bonusEndsAt;
    if (index === null || !item || endsAt === null) return;
    const left = endsAt - now();
    if (left <= 0) {
      settle(null);
      return;
    }
    timer.start(left, () => settle(null));
    emit('bonusQuestionStarted', { index, total: state.bonusCount, item, endsAt });
  }

  return {
    enter: () => emit('bonusIntro', { total: getState().bonusCount }),
    answer: (value) => settle(value),
    next() {
      if (!dispatch({ type: 'bonusNext', endsAt: now() + questionMs })) return;
      if (getState().status === 'finished') deps.finished();
      else ask();
    },
    resume() {
      const state = getState();
      const last = state.bonusResults.length - 1;
      const item = itemAt(last);
      const result = state.bonusResults[last];
      if (state.bonusEndsAt !== null) ask();
      else if (!item || !result) emit('bonusIntro', { total: state.bonusCount });
      else emit('bonusAnswered', { index: last, total: state.bonusCount, item, result });
    },
    dispose: () => timer.cancel(),
  };
}
