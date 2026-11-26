import { LOADING } from '@/config/game';
import { themeFor } from '@/config/themes';
import { puzzleNumber } from '@/core/date';
import type { Portraits } from '@/core/portrait';
import type { Animal, AnimalId, DateKey } from '@/core/types';
import { browserDelay, type Delay } from './frames';
import type { ScreenHost } from './host';
import { placeOnStage } from './layout/stage';
import { loadingView, pickFact } from './screens/loading';

export interface Loading {
  /**
   * The animals are in: the traveller is halfway, a "Did you know?" line
   * shows (without the loading kit, the traveller's still from `portraits`).
   */
  loaded(animals: ReadonlyMap<AnimalId, Animal>, portraits?: Portraits): void;
  /**
   * Waits for `ready` (today's sprites), at most LOADING.spriteWaitMs, walks the
   * rest of the path, and resolves once the screen has been up LOADING.minMs.
   */
  finish(ready: Promise<unknown>): Promise<void>;
}

export interface LoadingDeps {
  readonly delay?: Delay;
  readonly now?: () => number;
  readonly random?: () => number;
}

/** Path walked once the screen is up, and once the puzzle and animals are in. */
const STARTED = 0.1;
const DATA_IN = 0.5;

/**
 * Shows the loading screen for a day at once: its number and theme come from
 * the date, before anything has loaded. Whatever replaces the screen next
 * (start, a restored round, an error) simply takes its place.
 */
export function startLoading(host: ScreenHost, key: DateKey, deps: LoadingDeps = {}): Loading {
  const delay = deps.delay ?? browserDelay;
  const now = deps.now ?? (() => performance.now());
  const random = deps.random ?? Math.random;
  const wait = (ms: number) => new Promise<void>((resolve) => delay(resolve, ms));
  const view = loadingView({
    puzzleNumber: puzzleNumber(key),
    theme: themeFor(key),
  });
  // A new "Did you know?" line every LOADING.factMs while the screen is up.
  let stopFacts = () => {};
  const rotateFacts = (animals: ReadonlyMap<AnimalId, Animal>) => {
    view.setFact(pickFact(animals.values(), random));
    stopFacts = delay(() => rotateFacts(animals), LOADING.factMs);
  };
  host.showCustom((root) => {
    root.append(view.el);
    const unplace = placeOnStage(view.track, view.el.querySelector('.card__body') ?? root);
    return () => {
      stopFacts();
      unplace();
    };
  });
  view.setProgress(STARTED);
  const shownAt = now();

  return {
    loaded(animals, portraits) {
      view.setProgress(DATA_IN);
      view.setPortraits(portraits);
      rotateFacts(animals);
    },
    async finish(ready) {
      // A failed or slow sprite load must not hold the game (the scene draws emoji).
      await Promise.race([ready.catch(() => {}), wait(LOADING.spriteWaitMs)]);
      view.setProgress(1);
      const left = LOADING.minMs - (now() - shownAt);
      if (left > 0) await wait(left);
    },
  };
}
