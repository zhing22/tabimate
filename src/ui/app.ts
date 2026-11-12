import { REVEAL_SUSPENSE_MS, ROUND_TIME_MS } from '@/config/game';
import type { Clock } from '@/core/clock';
import { msUntilNextReset } from '@/core/date';
import type { GameBus } from '@/core/events';
import type { GameController } from '@/core/gameController';
import { biomeFor, pointsFor } from '@/core/journey';
import type { Stats } from '@/core/streak';
import type { Animal, AnimalId, Puzzle, RoundResult } from '@/core/types';
import type { TeamRound } from './components/teamCard';
import type { FrameLoop, Interval } from './frames';
import type { ScreenHost } from './host';
import { revealScreen } from './screens/reveal';
import { resultsScreen } from './screens/results';
import { mountRound, type RoundProps, type RoundScreen } from './screens/round';
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

export interface FinishedRun {
  readonly results: readonly RoundResult[];
  readonly score: number;
  /** Stats with this run already recorded. */
  readonly stats: Stats;
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
  const animalOf = (result: RoundResult) =>
    result.match.animalId === null ? null : (animals.get(result.match.animalId) ?? null);

  let round: RoundScreen | null = null;

  function showRound(props: RoundProps) {
    host.clearOverlay();
    if (round) {
      round.setRound(props);
      return;
    }
    host.showCustom((root) => {
      const screen = mountRound(
        root,
        props,
        { totalMs: ROUND_TIME_MS, now, ...(deps.frames ? { frames: deps.frames } : {}) },
        { submit: (text) => controller.submit(text) },
      );
      round = screen;
      return () => {
        screen.unmount();
        round = null;
      };
    });
  }

  function showReveal(result: RoundResult) {
    round?.lock();
    host.showOverlay(
      revealScreen,
      {
        result,
        animal: animalOf(result),
        points: pointsFor(result),
        suspenseMs: deps.suspenseMs ?? REVEAL_SUSPENSE_MS,
      },
      { revealed: (summary) => host.announce(summary) },
    );
  }

  function showResults({ results, score, stats }: FinishedRun) {
    // Fixed when the screen opens: asking "time to the next reset" every second
    // would jump back to 24 h at noon and never reach zero.
    const nextPuzzleAt = now() + msUntilNextReset(clock.now());
    const rounds: TeamRound[] = results.flatMap((result, i) => {
      const prompt = puzzle.prompts[i];
      return prompt ? [{ prompt, result, animal: animalOf(result) }] : [];
    });
    host.show(
      resultsScreen,
      {
        rounds,
        score,
        biomeName: biomeFor(score).name,
        streak: stats.streak,
        bestStreak: stats.bestStreak,
        msUntilNext: () => nextPuzzleAt - now(),
        ...(deps.interval ? { interval: deps.interval } : {}),
      },
      { next: deps.reload },
    );
    host.announce(`Journey complete: ${score} points.`);
  }

  const stops = [
    bus.on('roundStarted', ({ index, prompt, endsAt }) =>
      showRound({ index, total: puzzle.prompts.length, prompt, endsAt }),
    ),
    bus.on('answerMatched', ({ result }) => showReveal(result)),
    bus.on('runRestored', ({ state }) => {
      const last = state.results[state.results.length - 1];
      if (state.status === 'revealing' && last) showReveal(last);
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
