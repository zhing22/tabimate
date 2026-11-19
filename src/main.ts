// Composition root: the only place that picks real implementations and wires
// config, core, data, services and ui together.
import './ui/styles/index.css';
import { themeFor } from '@/config/themes';
import { dailyKey, msUntilNextReset } from '@/core/date';
import { biomeFor } from '@/core/journey';
import { createBus, type GameBus, type GameEvents } from '@/core/events';
import { createGameController } from '@/core/gameController';
import type { Animal, AnimalId, Puzzle } from '@/core/types';
import { createDebugPanel, readDebugParams } from '@/debug/debugPanel';
import { createLocalPuzzleSource } from '@/data/localPuzzleSource';
import { createJsonLoader } from '@/data/jsonLoader';
import { buildShareText, share } from '@/services/share';
import { browserScheduler } from '@/services/browserScheduler';
import { createProgressService } from '@/services/progress';
import { createLocalStorageAdapter } from '@/services/storage';
import { systemClock } from '@/services/systemClock';
import { createApp } from '@/ui/app';
import { loadingLine } from '@/ui/loadingLine';
import { createScreenHost } from '@/ui/host';
import { errorScreen, noPuzzleScreen } from '@/ui/screens/message';
import { watchViewport } from '@/ui/viewport';
import { startAudio, startHaptics } from '@/wiring/startAudio';
import { startScene } from '@/wiring/startScene';

const root = document.querySelector<HTMLElement>('#ui');
if (!root) throw new Error('index.html is missing #ui');

watchViewport();
const host = createScreenHost(root);
const clock = systemClock;
// One loader for all of public/, so animals.json is fetched once for puzzles and sprites.
const loader = createJsonLoader({ baseUrl: import.meta.env.BASE_URL });
const source = createLocalPuzzleSource({ loader });
const storage = createLocalStorageAdapter();
const progress = createProgressService(storage, clock);
const reload = () => location.reload();
// ?debug=1 shows the debug panel; with it, ?date=YYYY-MM-DD plays that day's puzzle.
const debug = readDebugParams(location.search);
const shareUrl = () => new URL(import.meta.env.BASE_URL, location.origin).href;

async function load() {
  const key = debug.date ?? dailyKey(clock.now());
  loadingLine(themeFor(key));
  const [puzzle, animals] = await Promise.all([source.getPuzzle(key), source.getAnimals()]);
  return { key, puzzle, animals };
}

function play(puzzle: Puzzle, animals: ReadonlyMap<AnimalId, Animal>): GameBus {
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

  // The results screen shows the scene's sprites; without a scene it uses emoji.
  const scene = startScene(bus, puzzle, animals, loader);
  startAudio(bus, storage, clock);
  startHaptics(bus, storage);

  // Subscribe the UI before restoring, so it hears the restored run's events.
  const app = createApp({
    host,
    bus,
    controller,
    puzzle,
    animals,
    clock,
    getStats: () => progress.getStats(),
    ...(scene ? { portraits: scene.portraits, backdrops: scene.backdrops } : {}),
    reload,
    // The link is this site, whatever host serves it (dev, preview or the real domain).
    share: ({ results, score }) =>
      share(
        buildShareText(
          { results, animals },
          puzzle.number,
          biomeFor(score),
          shareUrl(),
          themeFor(puzzle.date)?.name ?? null,
        ),
      ),
  });
  // One listener, in this order: record the run, then show results with its streak.
  bus.on('runFinished', ({ results, score }) => {
    progress.completeRun(controller.getState());
    app.showResults({ results, score, stats: progress.getStats() });
  });
  const saved = progress.loadToday(puzzle.date);
  if (!(saved && controller.restore(saved))) app.showStart();
  return bus;
}

load()
  .then(({ key, puzzle, animals }) => {
    const bus = puzzle ? play(puzzle, animals) : undefined;
    if (debug.enabled) {
      const panel = createDebugPanel({
        bus,
        puzzle,
        animals,
        storage,
        dateKey: key,
        navigate: (search) => (location.search = search),
        confirm: (question) => window.confirm(question),
      });
      document.body.append(panel.el);
    }
    if (puzzle) return;
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
