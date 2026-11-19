import kaplay, { type KAPLAYCtx } from 'kaplay';
import type { BiomeId } from '@/config/biomes';
import { revealNameMs } from '@/config/game';
import { MAX_VISIBLE_WIDTH, NATIVE_HEIGHT, RESIZE_DEBOUNCE_MS } from '@/config/render';
import type { GameBus } from '@/core/events';
import type { Backdrops, Portraits } from '@/core/portrait';
import { createBackdrops } from './backdrop';
import type { Animal, AnimalId, DateKey } from '@/core/types';
import { loadBiomeArt } from './biomes/load';
import { loadBorderArt } from './borders/load';
import { createEffectsLayer } from './effects/effectsLayer';
import { createRenderer } from './renderer';
import type { SpriteProvider } from './sprites/spriteProvider';
import { computeViewport, type Viewport } from './viewport';
import { dominantBiome } from './strip';
import { createWorld } from './world';

export interface SceneDeps {
  readonly animals: ReadonlyMap<AnimalId, Animal>;
  /** Seeds where props stand, so everyone sees the same walk that day. */
  readonly puzzleDate: DateKey;
  readonly createSprites: (k: KAPLAYCtx) => SpriteProvider;
  readonly reducedMotion?: boolean;
}

export interface Scene {
  /** Resolves once the sprites are loaded (the world is drawn before that). */
  readonly ready: Promise<void>;
  /** Stills of the sprites for the UI, once they are loaded (null if they failed). */
  readonly portraits: Portraits;
  /** A still of the scenery where a run ended, for the results line-up. */
  readonly backdrops: Backdrops;
  dispose(): void;
}

// Frames this long or longer (a stall, a tab coming back) count as one short step.
const MAX_STEP_S = 0.1;

/**
 * The canvas world behind the UI. It only listens to game events and never
 * talks back: the game plays the same without it.
 */
export function createScene(container: HTMLElement, bus: GameBus, deps: SceneDeps): Scene {
  const canvas = document.createElement('canvas');
  canvas.className = 'scene__canvas';
  container.append(canvas);

  // A fixed buffer at native resolution, scaled up by CSS in whole device pixels
  // (see layout). Kaplay never has to resize it, and the GPU fills few pixels.
  const k = kaplay({
    canvas,
    width: MAX_VISIBLE_WIDTH,
    height: NATIVE_HEIGHT,
    scale: 1,
    pixelDensity: 1,
    crisp: true,
    texFilter: 'nearest',
    global: false,
    loadingScreen: false,
    focus: false,
    touchToMouse: false,
    debug: false,
    burp: false,
    background: [0, 0, 0],
  });
  // Kaplay makes its canvas focusable; it must never take focus (and the
  // phone keyboard) from the answer box.
  canvas.tabIndex = -1;
  // Kaplay sets image-rendering: crisp-edges inline, which Chrome ignores (it
  // would smooth the upscale). pixelated is the value every browser honours.
  canvas.style.imageRendering = 'pixelated';

  const reducedMotion =
    deps.reducedMotion ?? window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const world = createWorld({ animals: deps.animals, reducedMotion });
  const art = loadBiomeArt(k);
  const sprites = deps.createSprites(k);
  let loaded = false;
  const ready = sprites.load(deps.animals.values()).then(() => {
    loaded = true;
  });
  const effects = createEffectsLayer(k, { reducedMotion });
  const scenery = { art, borders: loadBorderArt(k), seed: deps.puzzleDate, reducedMotion };
  const backdrop = createBackdrops(scenery);
  const draw = createRenderer(k, world, { ...scenery, sprites, effects });

  let view: Viewport = computeViewport(1, 1, 1);
  let skyShown: BiomeId | null = null;
  function layout() {
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = container.getBoundingClientRect();
    view = computeViewport(width, height, dpr);
    canvas.style.width = `${(MAX_VISIBLE_WIDTH * view.scale) / dpr}px`;
    canvas.style.height = `${(NATIVE_HEIGHT * view.scale) / dpr}px`;
    canvas.style.top = `${view.offsetY / dpr}px`;
  }
  layout();
  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  const relayout = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, RESIZE_DEBOUNCE_MS);
  };
  const observer = new ResizeObserver(relayout);
  observer.observe(container);
  window.addEventListener('orientationchange', relayout);

  const onVisibility = () => {
    k.debug.paused = document.hidden;
  };
  document.addEventListener('visibilitychange', onVisibility);

  k.onUpdate(() => world.update(Math.min(k.dt(), MAX_STEP_S)));
  k.onDraw(() => {
    // Rows above the scene show the sky's top colour; set only when it changes.
    const sky = dominantBiome(world.state);
    if (sky !== skyShown) {
      skyShown = sky;
      container.style.backgroundColor = art[sky].sky[0];
    }
    draw(view, loaded);
  });

  // An answer joins the party while its reveal is still up, the moment the
  // card shows its name (same timing config as the UI), so the player sees the
  // animal fall in behind them and the walk, and any new biome, straight away.
  const joins = new Set<ReturnType<typeof setTimeout>>();
  const cancelJoins = () => {
    for (const timer of joins) clearTimeout(timer);
    joins.clear();
  };
  const stops = [
    bus.on('runRestored', ({ state }) => {
      cancelJoins();
      // Every saved answer has been revealed (a reload mid-reveal included).
      world.restore(state.results);
      effects.sync(world.followers, false); // the party as it was: idle effects, no entrances
    }),
    bus.on('answerMatched', ({ result }) => {
      // As the reveal shows the name (after the jackpot freeze for a top-level find).
      const at = revealNameMs(result.match.level);
      const timer = setTimeout(() => {
        joins.delete(timer);
        world.join(result);
        effects.sync(world.followers, true); // the newcomer makes its entrance
      }, at);
      joins.add(timer);
    }),
  ];

  return {
    ready,
    backdrops: (score) => Promise.resolve(backdrop(score)),
    portraits: (animal, shiny) =>
      ready.then(
        () => sprites.portrait(animal, shiny),
        () => null,
      ),
    dispose() {
      for (const stop of stops) stop();
      cancelJoins();
      observer.disconnect();
      clearTimeout(resizeTimer);
      window.removeEventListener('orientationchange', relayout);
      document.removeEventListener('visibilitychange', onVisibility);
      effects.dispose();
      k.quit();
      canvas.remove();
    },
  };
}
