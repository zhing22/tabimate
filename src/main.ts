// Composition root: the only place that picks real implementations and wires
// config, core, data, services and ui together.
import './ui/styles/index.css';
import { SPRITE_SOURCE } from '@/config/render';
import { dailyKey, msUntilNextReset } from '@/core/date';
import { createBus, type GameBus, type GameEvents } from '@/core/events';
import { createGameController } from '@/core/gameController';
import type { Animal, AnimalId, Puzzle } from '@/core/types';
import { createLocalPuzzleSource } from '@/data/localPuzzleSource';
import { createJsonLoader } from '@/data/jsonLoader';
import { loadSheetFiles, loadSpriteArt } from '@/data/spriteArtSource';
import { createScene } from '@/scene/sceneManager';
import { createEmojiSpriteProvider } from '@/scene/sprites/emojiSpriteProvider';
import { createPixelSpriteProvider, readSheet } from '@/scene/sprites/pixelSpriteProvider';
import { createAudio } from '@/services/audio';
import { browserScheduler } from '@/services/browserScheduler';
import { createProgressService } from '@/services/progress';
import { createLocalStorageAdapter } from '@/services/storage';
import { systemClock } from '@/services/systemClock';
import { createApp } from '@/ui/app';
import { muteButton } from '@/ui/components/muteButton';
import { createScreenHost } from '@/ui/host';
import { errorScreen, noPuzzleScreen } from '@/ui/screens/message';
import { watchViewport } from '@/ui/viewport';

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

async function load(): Promise<{ puzzle: Puzzle | null; animals: ReadonlyMap<AnimalId, Animal> }> {
  const key = dailyKey(clock.now());
  const [puzzle, animals] = await Promise.all([source.getPuzzle(key), source.getAnimals()]);
  return { puzzle, animals };
}

/**
 * The scene is scenery: if it can't start (no WebGL, say), the game is still
 * fully playable over the CSS backdrop, so a failure is only logged.
 */
function startScene(bus: GameBus, puzzle: Puzzle, animals: ReadonlyMap<AnimalId, Animal>) {
  const container = document.querySelector<HTMLElement>('#scene');
  if (!container) return;
  try {
    const scene = createScene(container, bus, {
      animals,
      puzzleDate: puzzle.date,
      createSprites: (k) => {
        const emoji = createEmojiSpriteProvider(k);
        if (SPRITE_SOURCE === 'emoji') return emoji;
        return createPixelSpriteProvider(k, {
          loadArt: () => loadSpriteArt(loader),
          loadSheet: async (archetype) => readSheet(await loadSheetFiles(loader, archetype)),
          fallback: emoji,
        });
      },
    });
    scene.ready.catch((error: unknown) => console.error('Scene sprites failed to load', error));
  } catch (error) {
    console.error('Scene failed to start; playing without it', error);
  }
}

/**
 * Sound listens to the bus like the scene; the corner button only flips mute.
 * Like the scene, it is extra: if it fails the game plays on, silently.
 */
function startAudio(bus: GameBus) {
  try {
    const audio = createAudio({ bus, storage, clock });
    const toggle = muteButton({
      muted: audio.muted,
      onToggle: () => {
        audio.setMuted(!audio.muted);
        return audio.muted;
      },
    });
    document.body.append(toggle.el);
  } catch (error) {
    console.error('Audio failed to start; playing without sound', error);
  }
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

  startScene(bus, puzzle, animals);
  startAudio(bus);

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
