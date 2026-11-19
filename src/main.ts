// Composition root: the only place that picks real implementations and wires
// config, core, data, services and ui together.
import './ui/styles/index.css';
import { SPRITE_SOURCE } from '@/config/render';
import { themeFor } from '@/config/themes';
import { dailyKey, msUntilNextReset } from '@/core/date';
import { biomeFor } from '@/core/journey';
import { createBus, type GameBus, type GameEvents } from '@/core/events';
import { createGameController } from '@/core/gameController';
import type { Animal, AnimalId, Puzzle } from '@/core/types';
import { createDebugPanel, readDebugParams } from '@/debug/debugPanel';
import { createLocalPuzzleSource } from '@/data/localPuzzleSource';
import { createJsonLoader } from '@/data/jsonLoader';
import { loadSheetFiles, loadSpriteArt } from '@/data/spriteArtSource';
import { createScene, type Scene } from '@/scene/sceneManager';
import { createEmojiSpriteProvider } from '@/scene/sprites/emojiSpriteProvider';
import { createPixelSpriteProvider, readSheet } from '@/scene/sprites/pixelSpriteProvider';
import { createAudio } from '@/services/audio';
import { buildShareText, share } from '@/services/share';
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
// ?debug=1 shows the debug panel; with it, ?date=YYYY-MM-DD plays that day's puzzle.
const debug = readDebugParams(location.search);
const shareUrl = () => new URL(import.meta.env.BASE_URL, location.origin).href;

/** The day's theme is known from the date alone, so the loading line can name it at once. */
function showThemeWhileLoading(key: string) {
  const theme = themeFor(key);
  const line = document.querySelector('.loading');
  if (theme && line) line.textContent = `Packing your bag for ${theme.name}…`;
}

async function load() {
  const key = debug.date ?? dailyKey(clock.now());
  showThemeWhileLoading(key);
  const [puzzle, animals] = await Promise.all([source.getPuzzle(key), source.getAnimals()]);
  return { key, puzzle, animals };
}

/**
 * The scene is scenery: if it can't start (no WebGL, say), the game is still
 * fully playable over the CSS backdrop, so a failure is only logged.
 */
function startScene(
  bus: GameBus,
  puzzle: Puzzle,
  animals: ReadonlyMap<AnimalId, Animal>,
): Pick<Scene, 'portraits' | 'backdrops'> | null {
  const container = document.querySelector<HTMLElement>('#scene');
  if (!container) return null;
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
    return scene;
  } catch (error) {
    console.error('Scene failed to start; playing without it', error);
    return null;
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
  const scene = startScene(bus, puzzle, animals);
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
