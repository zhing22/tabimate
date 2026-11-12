import kaplay, { type KAPLAYCtx } from 'kaplay';
import type { BiomeId } from '@/config/biomes';
import { MAX_VISIBLE_WIDTH, NATIVE_HEIGHT, RESIZE_DEBOUNCE_MS } from '@/config/render';
import type { GameBus } from '@/core/events';
import type { Animal, AnimalId, DateKey } from '@/core/types';
import { loadBiomeArt } from './biomes/load';
import { createRenderer } from './renderer';
import type { SpriteProvider } from './sprites/spriteProvider';
import { computeViewport, type Viewport } from './viewport';
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
  const draw = createRenderer(k, world, art, sprites, deps.puzzleDate);

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
    if (world.biome.to !== skyShown) {
      skyShown = world.biome.to;
      container.style.backgroundColor = art[skyShown].sky[0];
    }
    draw(view, loaded);
  });

  const stops = [
    bus.on('runRestored', ({ state }) => {
      // Mid-reveal, the last answer has not joined yet: it does on revealFinished.
      const joined = state.status === 'revealing' ? state.results.slice(0, -1) : state.results;
      world.restore(joined);
      const last = state.results[state.results.length - 1];
      if (state.status === 'revealing' && last) world.answered(last);
    }),
    bus.on('answerMatched', ({ result }) => world.answered(result)),
    bus.on('revealFinished', () => world.revealDone()),
    bus.on('biomeEntered', ({ biome }) => world.enterBiome(biome.id as BiomeId)),
  ];

  return {
    ready,
    dispose() {
      for (const stop of stops) stop();
      observer.disconnect();
      clearTimeout(resizeTimer);
      window.removeEventListener('orientationchange', relayout);
      document.removeEventListener('visibilitychange', onVisibility);
      k.quit();
      canvas.remove();
    },
  };
}
