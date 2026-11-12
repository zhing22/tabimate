import { WALK_SPEED } from '@/config/render';

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
  /** Walks `distance` further, eased in and out. Adds to a walk in progress. */
  walkBy(distance: number): void;
  /** Stands at x at once (restoring a saved run). */
  placeAt(x: number): void;
  update(dtS: number): void;
}

const MIN_WALK_S = 0.5;
const easeInOut = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;

export function createPlayer(): Player {
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
    walkBy(distance) {
      if (distance <= 0) return;
      from = x;
      to += distance;
      duration = Math.max(MIN_WALK_S, (to - from) / WALK_SPEED);
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
