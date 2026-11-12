// Composition root: the only place that picks real implementations and wires
// config, core, data, services and ui together.
import './ui/styles/tokens.css';
import './ui/styles/base.css';
import './ui/styles/screens.css';
import { dailyKey, msUntilNextReset } from '@/core/date';
import { createBus, type GameEvents } from '@/core/events';
import { createGameController } from '@/core/gameController';
import type { Animal, AnimalId, Puzzle } from '@/core/types';
import { createLocalPuzzleSource } from '@/data/localPuzzleSource';
import { browserScheduler } from '@/services/browserScheduler';
import { createProgressService } from '@/services/progress';
import { createLocalStorageAdapter } from '@/services/storage';
import { systemClock } from '@/services/systemClock';
import { createApp } from '@/ui/app';
import { createScreenHost } from '@/ui/host';
import { errorScreen, noPuzzleScreen } from '@/ui/screens/message';
import { watchViewport } from '@/ui/viewport';

const root = document.querySelector<HTMLElement>('#ui');
if (!root) throw new Error('index.html is missing #ui');

watchViewport();
const host = createScreenHost(root);
const clock = systemClock;
const source = createLocalPuzzleSource({ baseUrl: import.meta.env.BASE_URL });
const progress = createProgressService(createLocalStorageAdapter(), clock);
const reload = () => location.reload();

async function load(): Promise<{ puzzle: Puzzle | null; animals: ReadonlyMap<AnimalId, Animal> }> {
  const key = dailyKey(clock.now());
  const [puzzle, animals] = await Promise.all([source.getPuzzle(key), source.getAnimals()]);
  return { puzzle, animals };
}

function play(puzzle: Puzzle, animals: ReadonlyMap<AnimalId, Animal>) {
  const bus = createBus<GameEvents>({
    onError: (error, type) => console.error(`Listener for "${String(type)}" failed`, error),
  });
  const controller = createGameController({
    puzzle,
    animals,
    bus,
    clock,
    scheduler: browserScheduler,
  });
  bus.on('stateChanged', ({ state }) => progress.saveRun(state));

  // Subscribe the UI before restoring, so it hears the restored run's events.
  const app = createApp({
    host,
    bus,
    controller,
    puzzle,
    animals,
    clock,
    getStats: () => progress.getStats(),
    reload,
  });
  // One listener, in this order: record the run, then show results with its streak.
  bus.on('runFinished', ({ results, score }) => {
    progress.completeRun(controller.getState());
    app.showResults({ results, score, stats: progress.getStats() });
  });
  const saved = progress.loadToday(puzzle.date);
  if (!(saved && controller.restore(saved))) app.showStart();
}

load()
  .then(({ puzzle, animals }) => {
    if (puzzle) {
      play(puzzle, animals);
      return;
    }
    // A fixed target, so the countdown reaches zero instead of restarting at noon.
    const nextAt = clock.now().getTime() + msUntilNextReset(clock.now());
    const msUntilNext = () => nextAt - clock.now().getTime();
    host.show(noPuzzleScreen, { msUntilNext }, { reload });
  })
  .catch((error: unknown) => {
    console.error(error);
    host.show(
      errorScreen,
      { message: error instanceof Error ? error.message : String(error) },
      { reload },
    );
  });
