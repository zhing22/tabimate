import { REVEAL_SUSPENSE_MS, ROUND_TIME_MS } from '@/config/game';
import type { Clock } from '@/core/clock';
import { msUntilNextReset } from '@/core/date';
import type { GameBus } from '@/core/events';
import type { GameController } from '@/core/gameController';
import { pointsFor } from '@/core/journey';
import type { Stats } from '@/core/streak';
import type { Animal, AnimalId, Puzzle, RoundResult } from '@/core/types';
import type { FrameLoop, Interval } from './frames';
import type { ScreenHost } from './host';
import { revealScreen } from './screens/reveal';
import { resultsScreen } from './screens/results';
import { resultsProps, type AnimalOf, type FinishedRun } from './resultsProps';

export type { FinishedRun } from './resultsProps';
import { roundSlot } from './roundSlot';
import { DID_YOU_MEAN, NOT_FOUND } from './screens/roundView';
import { startScreen } from './screens/start';

export interface AppDeps {
  readonly host: ScreenHost;
  readonly bus: GameBus;
  readonly controller: GameController;
  readonly puzzle: Puzzle;
  readonly animals: ReadonlyMap<AnimalId, Animal>;
  readonly clock: Clock;
  readonly getStats: () => Stats;
  /** Loads the page again, e.g. when a new puzzle is out. */
  readonly reload: () => void;
  readonly suspenseMs?: number;
  readonly frames?: FrameLoop;
  readonly interval?: Interval;
}

export interface App {
  /** Shows the start screen (when there was no saved run to restore). */
  showStart(): void;
  /**
   * Shows the results. main.ts calls it after recording the run, instead of a
   * runFinished listener here, so the streak never depends on which listener
   * subscribed first.
   */
  showResults(run: FinishedRun): void;
  destroy(): void;
}

/**
 * The UI router: turns game events into screens and player actions into
 * controller calls. It never changes game state itself.
 */
export function createApp(deps: AppDeps): App {
  const { host, bus, controller, puzzle, animals, clock } = deps;
  const now = () => clock.now().getTime();
  const animalOf: AnimalOf = (result) =>
    result.match.animalId === null ? null : (animals.get(result.match.animalId) ?? null);
  // Moving on only counts once the result is visible, so an Enter pressed twice
  // in a hurry can't skip past a reveal during its drum-roll.
  let resultShown = false;
  const next = () => {
    if (!resultShown) return;
    resultShown = false;
    controller.next();
  };
  const round = roundSlot(
    host,
    { totalMs: ROUND_TIME_MS, now, ...(deps.frames ? { frames: deps.frames } : {}) },
    { submit: (text) => controller.submit(text), next, draft: (text) => controller.setDraft(text) },
  );

  function showReveal(index: number, result: RoundResult) {
    resultShown = false;
    round.lock();
    host.showOverlay(
      revealScreen,
      {
        result,
        animal: animalOf(result),
        points: pointsFor(result),
        suspenseMs: deps.suspenseMs ?? REVEAL_SUSPENSE_MS,
        isLast: index === puzzle.prompts.length - 1,
        focusNext: !round.mounted,
      },
      {
        revealed: (summary) => {
          resultShown = true;
          host.announce(summary);
        },
        next,
      },
    );
  }

  function showResults(run: FinishedRun) {
    // Fixed when the screen opens: asking "time to the next reset" every second
    // would jump back to 24 h at noon and never reach zero.
    const nextPuzzleAt = now() + msUntilNextReset(clock.now());
    const props = resultsProps(puzzle, animalOf, run, () => nextPuzzleAt - now());
    host.show(
      resultsScreen,
      { ...props, ...(deps.interval ? { interval: deps.interval } : {}) },
      { next: deps.reload },
    );
    host.announce(`Journey complete: ${run.score} points.`);
  }

  const stops = [
    bus.on('roundStarted', ({ index, prompt, endsAt }) =>
      round.show({ index, total: puzzle.prompts.length, prompt, endsAt }),
    ),
    // Spoken through the host's live region, which re-reads a repeated message.
    bus.on('answerRejected', () => {
      round.reject();
      host.announce(NOT_FOUND);
    }),
    bus.on('answerSuggested', ({ suggestion }) => {
      round.suggest(suggestion);
      host.announce(`${suggestion}. ${DID_YOU_MEAN}`);
    }),
    bus.on('answerMatched', ({ round: index, result }) => showReveal(index, result)),
    bus.on('runRestored', ({ state }) => {
      const index = state.results.length - 1;
      const last = state.results[index];
      if (state.status === 'revealing' && last) showReveal(index, last);
    }),
    bus.on('biomeEntered', ({ biome }) => host.announce(`You entered the ${biome.name}.`)),
  ];

  return {
    showStart() {
      host.show(
        startScreen,
        {
          puzzleNumber: puzzle.number,
          promptCount: puzzle.prompts.length,
          streak: deps.getStats().streak,
        },
        { play: () => controller.start() },
      );
    },
    showResults,
    destroy() {
      for (const stop of stops) stop();
      host.destroy();
    },
  };
}
