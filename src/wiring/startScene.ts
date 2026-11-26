// The scene, loaded on demand (v3 Step 3): main.ts calls these at once, and
// they fetch the scene's code with import(), so the first JavaScript stays
// small and the download overlaps the day's data. Kaplay and src/scene live
// in sceneParts.ts; the still and the portraits (no Kaplay) in stillParts.ts.
import { SPRITE_SOURCE } from '@/config/render';
import type { GameBus } from '@/core/events';
import type { Backdrops, Portraits } from '@/core/portrait';
import type { Animal, AnimalId, Puzzle } from '@/core/types';
import type { JsonLoader } from '@/data/jsonLoader';
import type * as ScenePartsModule from './sceneParts';

type SceneParts = typeof ScenePartsModule;
let sceneParts: Promise<SceneParts> | undefined;

/** Starts downloading the live scene's code now (call as the loading screen shows). */
export const preloadScene = (): Promise<SceneParts> => (sceneParts ??= import('./sceneParts'));

const stillParts = () => import('./stillParts');

/**
 * The Town painted on a plain canvas while the day loads, as soon as its
 * small chunk arrives. dispose() works before then too. A failure is only logged.
 */
export function startStillScene(): { dispose(): void } {
  let disposed = false;
  let still: { dispose(): void } | null = null;
  void stillParts()
    .then((parts) => {
      if (!disposed) still = parts.showStill();
    })
    .catch((error: unknown) => console.error('The still scene failed to paint', error));
  return {
    dispose() {
      disposed = true;
      still?.dispose();
    },
  };
}

export interface LazyScene {
  /** Today's sprites are loaded; rejects without a scene (it couldn't load or start). */
  readonly ready: Promise<unknown>;
  /** Sprite stills once the scene has them; null (the emoji) without one. */
  readonly portraits: Portraits;
  readonly backdrops: Backdrops;
}

/**
 * The live scene, made once its code has loaded. It subscribes to the bus
 * then; main.ts waits for `ready` before the game begins, so no event is missed.
 */
export function startScene(
  bus: GameBus,
  puzzle: Puzzle,
  animals: ReadonlyMap<AnimalId, Animal>,
  loader: JsonLoader,
): LazyScene {
  const scene = preloadScene().then(
    (parts) => parts.createLiveScene(bus, puzzle, animals, loader),
    (error: unknown) => {
      console.error('The scene could not load; playing without it', error);
      return null;
    },
  );
  return {
    ready: scene.then((live) => live?.ready ?? Promise.reject(new Error('No scene'))),
    portraits: (animal, shiny) => scene.then((live) => live?.portraits(animal, shiny) ?? null),
    backdrops: (score) => scene.then((live) => live?.backdrops(score) ?? null),
  };
}

/**
 * Pixel portraits of any animal for the loading card and the Field Journal
 * (the scene has only today's). Undefined with emoji sprites: emoji show.
 */
export function journalPortraits(
  animals: ReadonlyMap<AnimalId, Animal>,
  loader: JsonLoader,
): Portraits | undefined {
  if (SPRITE_SOURCE === 'emoji') return undefined;
  const made = stillParts().then((parts) => parts.createJournalPortraits(animals, loader));
  return (animal, shiny) =>
    made.then(
      (portraits) => portraits(animal, shiny),
      () => null,
    );
}
