// Composition root: the only place that picks real implementations and wires
// config, core, data, services and ui together.
import './ui/styles/index.css';
import { dailyKey, msUntilNextReset } from '@/core/date';
import { createBus, type GameBus, type GameEvents } from '@/core/events';
import { emitCollected } from '@/core/collectionEvents';
import { createGameController } from '@/core/gameController';
import { puzzleAnimals } from '@/core/puzzleAnimals';
import type { Animal, AnimalId, Puzzle } from '@/core/types';
import { readDebugParams } from '@/debug/debugPanel';
import { createLocalPuzzleSource } from '@/data/localPuzzleSource';
import { createJsonLoader } from '@/data/jsonLoader';
import { browserScheduler } from '@/services/browserScheduler';
import { createInstallOffer } from '@/services/install';
import { createProgressService } from '@/services/progress';
import { createLocalStorageAdapter } from '@/services/storage';
import { systemClock } from '@/services/systemClock';
import { createApp } from '@/ui/app';
import { startLoading } from '@/ui/loadingFlow';
import { createScreenHost } from '@/ui/host';
import { startLayout } from '@/ui/layout/shell';
import { watchMuteKey } from '@/ui/layout/muteKey';
import { errorScreen, noPuzzleScreen } from '@/ui/screens/message';
import { watchViewport } from '@/ui/viewport';
import { startAudio, startHaptics } from '@/wiring/startAudio';
import { startDebug } from '@/wiring/startDebug';
import { journalPortraits, startScene, startStillScene } from '@/wiring/startScene';
import { startShare } from '@/wiring/startShare';
import { startStats } from '@/wiring/startStats';

const root = document.querySelector<HTMLElement>('#ui');
if (!root) throw new Error('index.html is missing #ui');

watchViewport();
startLayout();
// The Town, painted at once: the loading screen shows over the scene, not a blank sky.
const still = startStillScene();
const host = createScreenHost(root);
const clock = systemClock;
// One loader for all of public/, so animals.json is fetched once for puzzles and sprites.
const loader = createJsonLoader({ baseUrl: import.meta.env.BASE_URL });
const source = createLocalPuzzleSource({ loader });
const storage = createLocalStorageAdapter();
const progress = createProgressService(storage, clock);
// Made at load: the browser's install prompt can fire before the game starts.
const install = createInstallOffer(storage, () => progress.getStats().history.length);
const reload = () => location.reload();
// ?debug=1 shows the debug panel; with it, ?date=YYYY-MM-DD plays that day's puzzle.
const debug = readDebugParams(location.search);
const shareUrl = () => new URL(import.meta.env.BASE_URL, location.origin).href;
// Player stats: the API on the live site, nothing in development (a run that
// failed to send last time is retried once now).
const playerStats = startStats(storage, shareUrl());

const key = debug.date ?? dailyKey(clock.now());
// The loading screen goes up at once: the day's number and theme come from the date.
const loading = startLoading(host, key);

async function load() {
  const [puzzle, animals] = await Promise.all([source.getPuzzle(key), source.getAnimals()]);
  loading.loaded(animals);
  return { puzzle, animals };
}

interface Game {
  readonly bus: GameBus;
  /** Today's sprites are loaded (or the scene couldn't start). */
  readonly ready: Promise<unknown>;
  /** Shows the start screen, or picks a saved run back up. */
  begin(): void;
}

function play(puzzle: Puzzle, animals: ReadonlyMap<AnimalId, Animal>): Game {
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

  // The scene loads sprites for today's animals only, while the loading screen is up.
  // The results screen shows its sprites; without a scene it uses emoji.
  const scene = startScene(bus, puzzle, puzzleAnimals(puzzle, animals), loader);
  // The live scene covers the still; once it has its sprites the still goes.
  // Without a scene (no WebGL) the still stays as the backdrop.
  void scene?.ready.finally(() => still?.dispose());
  const sound = startAudio(bus, storage, clock);
  if (sound) watchMuteKey(sound, (text) => host.announce(text));
  startHaptics(bus, storage);

  // The link is this site, whatever host serves it (dev, preview or the real domain).
  const sharing = startShare({
    puzzle,
    animals,
    portraits: scene?.portraits,
    backdrops: scene?.backdrops,
    url: shareUrl,
  });

  // Subscribe the UI before restoring, so it hears the restored run's events.
  const app = createApp({
    host,
    bus,
    controller,
    puzzle,
    animals,
    clock,
    getStats: () => progress.getStats(),
    getCollection: () => progress.getCollection(),
    ...(scene ? { portraits: scene.portraits, backdrops: scene.backdrops } : {}),
    journalPortraits: journalPortraits(animals, loader),
    getStreakStatus: () => progress.streakStatus(),
    install,
    reload,
    share: sharing.share,
    saveImage: sharing.saveImage,
    dayStats: (dateKey) => playerStats.dayStats(dateKey),
    sound,
  });
  // One listener, in this order: record the run (streak, journal, achievements),
  // show results with its streak, then announce what it added to the collection.
  bus.on('runFinished', (totals) => {
    const collected = progress.completeRun(controller.getState(), animals);
    // A reload of a finished run sends it again; the server keeps the first.
    playerStats.submit(puzzle, totals.results);
    const run = { ...totals, stats: progress.getStats() };
    app.showResults(run);
    sharing.prepare(run);
    if (collected) emitCollected(bus, collected, puzzle.date);
  });
  return {
    bus,
    ready: scene?.ready ?? Promise.resolve(),
    begin() {
      const saved = progress.loadToday(puzzle.date);
      if (!(saved && controller.restore(saved))) app.showStart();
    },
  };
}

load()
  .then(async ({ puzzle, animals }) => {
    const game = puzzle ? play(puzzle, animals) : undefined;
    if (debug.enabled) {
      const fillJournal = () => progress.fillJournal(animals);
      startDebug({ bus: game?.bus, puzzle, animals, storage, dateKey: key, fillJournal });
    }
    if (game) {
      await loading.finish(game.ready);
      game.begin();
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
