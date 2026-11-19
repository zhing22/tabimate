import { LOADING } from '@/config/game';
import { themeFor } from '@/config/themes';
import { puzzleNumber } from '@/core/date';
import type { Animal, AnimalId, DateKey } from '@/core/types';
import { browserDelay, type Delay } from './frames';
import type { ScreenHost } from './host';
import { loadingView, pickFact } from './screens/loading';

export interface Loading {
  /** The animals are in: the traveller is halfway, and a "Did you know?" line shows. */
  loaded(animals: ReadonlyMap<AnimalId, Animal>): void;
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
    animalEmoji: LOADING.animalEmoji[Math.floor(random() * LOADING.animalEmoji.length)] ?? '🦊',
  });
  host.showCustom((root) => {
    root.append(view.el);
    return () => {};
  });
  view.setProgress(STARTED);
  const shownAt = now();

  return {
    loaded(animals) {
      view.setProgress(DATA_IN);
      view.setFact(pickFact(animals.values(), random));
    },
    async finish(ready) {
      // A failed or slow sprite load must not hold the game: emoji stand in.
      await Promise.race([ready.catch(() => {}), wait(LOADING.spriteWaitMs)]);
      view.setProgress(1);
      const left = LOADING.minMs - (now() - shownAt);
      if (left > 0) await wait(left);
    },
  };
}
