import { msUntilNextReset } from '@/core/date';
import { biomeFor } from '@/core/journey';
import type { AppDeps } from './appTypes';
import type { createCollectionUi } from './collectionUi';
import { resultsProps, type AnimalOf, type FinishedRun } from './resultsProps';
import type { OpenScreen } from './screenLoader';

// Loaded when a run ends (screenLoader.ts): not needed to play.
const loadResults = () => import('./screens/results');
const loadSummary = () => import('./screens/resultsSummary');

export interface ResultsFlowDeps {
  readonly app: AppDeps;
  readonly collection: ReturnType<typeof createCollectionUi>;
  readonly animalOf: AnimalOf;
  readonly openScreen: OpenScreen;
}

/**
 * The end of a run: the results page and, once it is closed (portrait), the
 * summary under the scene that opens it again. Pages opened from the results
 * go Back to them, and × to the summary.
 */
export function createResultsFlow({ app, collection, animalOf, openScreen }: ResultsFlowDeps) {
  const { host, puzzle, animals, clock } = app;
  const now = () => clock.now().getTime();

  function summary(run: FinishedRun) {
    const { rounds } = resultsProps(puzzle, animalOf, animals, run, () => 0);
    openScreen(loadSummary, ({ resultsSummaryScreen }) =>
      host.show(
        resultsSummaryScreen,
        {
          score: run.score,
          biomeName: biomeFor(run.base).name,
          rounds,
          portraits: app.portraits,
          sound: app.sound,
          delay: app.delay,
        },
        {
          open: () => results(run),
          share: () => app.share(run),
          ...collection.links(() => summary(run)),
        },
      ),
    );
  }

  function results(run: FinishedRun) {
    // Fixed when the screen opens: asking "time to the next reset" every second
    // would jump back to 24 h at noon and never reach zero.
    const nextPuzzleAt = now() + msUntilNextReset(clock.now());
    const props = resultsProps(puzzle, animalOf, animals, run, () => nextPuzzleAt - now());
    openScreen(loadResults, ({ resultsScreen }) => show(resultsScreen, props, run));
  }

  function show(
    resultsScreen: Awaited<ReturnType<typeof loadResults>>['resultsScreen'],
    props: ReturnType<typeof resultsProps>,
    run: FinishedRun,
  ) {
    host.show(
      resultsScreen,
      {
        ...props,
        ...(app.delay ? { delay: app.delay } : {}),
        ...(app.portraits ? { portraits: app.portraits } : {}),
        ...(app.backdrops ? { backdrops: app.backdrops } : {}),
        ...(app.dayStats ? { dayStats: app.dayStats(puzzle.date) } : {}),
        install: app.install,
      },
      {
        next: app.reload,
        close: () => summary(run),
        share: () => app.share(run),
        saveImage: app.saveImage && (() => app.saveImage?.(run)),
        ...collection.links(() => results(run)),
      },
    );
  }

  return { show: results };
}
