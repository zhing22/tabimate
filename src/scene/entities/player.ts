import { WALK } from '@/config/render';

/**
 * The player's walk along the journey. Pure state: the scene reads x and
 * walking each frame and draws accordingly.
 */
export interface Player {
  /** World x, native px (fractional while walking; drawn rounded). */
  readonly x: number;
  readonly walking: boolean;
  /** Seconds spent walking in the current walk, for the step animation. */
  readonly stepTime: number;
  /** Where the current walk ends (x itself when standing). */
  readonly targetX: number;
  /** Walks `distance` further, eased in and out. Adds to a walk in progress. */
  walkBy(distance: number): void;
  /** Stands at x at once (restoring a saved run). */
  placeAt(x: number): void;
  update(dtS: number): void;
}

const easeInOut = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;

/**
 * A walk's length in seconds: at WALK.speed, sped up past WALK.maxS so a long
 * walk doesn't drag, never shorter than WALK.minS. Reduced motion: always short.
 */
export const walkSeconds = (distance: number, reducedMotion = false): number =>
  reducedMotion ? WALK.reducedS : Math.min(WALK.maxS, Math.max(WALK.minS, distance / WALK.speed));

export function createPlayer(options: { reducedMotion?: boolean } = {}): Player {
  let x = 0;
  let from = 0;
  let to = 0;
  let duration = 0;
  let elapsed = 0;
  let stepTime = 0;

  return {
    get x() {
      return x;
    },
    get walking() {
      return elapsed < duration;
    },
    get stepTime() {
      return stepTime;
    },
    get targetX() {
      return to;
    },
    walkBy(distance) {
      if (distance <= 0) return;
      from = x;
      to += distance;
      duration = walkSeconds(to - from, options.reducedMotion);
      elapsed = 0;
    },
    placeAt(target) {
      x = from = to = target;
      duration = elapsed = 0;
    },
    update(dtS) {
      if (elapsed >= duration) {
        stepTime = 0;
        return;
      }
      elapsed = Math.min(duration, elapsed + dtS);
      stepTime += dtS;
      x = from + (to - from) * easeInOut(elapsed / duration);
    },
  };
}
