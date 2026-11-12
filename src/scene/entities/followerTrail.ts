import { GROUND_Y } from '@/config/render';
import type { Movement } from '@/core/types';

/** A position the scene writes into, so the frame loop allocates nothing. */
export interface Point {
  x: number;
  y: number;
}

/**
 * The path the player has walked, one sample per native pixel, in a ring
 * buffer. Followers stand on it a fixed path distance back, so they take the
 * player's exact route (bumps and all) rather than a straight line.
 */
export interface Trail {
  /** Starts the path afresh, as if the player had always walked up to (x, y). */
  reset(x: number, y: number): void;
  /** Adds the player's new position; call whenever the player moves. */
  record(x: number, y: number): void;
  /** Where the path was `distance` px behind the player. */
  pointBehind(distance: number, out: Point): Point;
}

export function createTrail(capacity: number): Trail {
  const xs = new Float32Array(capacity);
  const ys = new Float32Array(capacity);
  let head = 0; // index of the newest sample
  let lastX = 0;
  let lastY = 0;

  const push = (x: number, y: number) => {
    head = (head + 1) % capacity;
    xs[head] = x;
    ys[head] = y;
  };

  const trail: Trail = {
    reset(x, y) {
      // Fill backwards in a straight line, so followers have somewhere to
      // stand before the player has walked that far.
      for (let i = 0; i < capacity; i++) {
        const at = (head - i + capacity) % capacity;
        xs[at] = x - i;
        ys[at] = y;
      }
      lastX = x;
      lastY = y;
    },

    record(x, y) {
      // Samples exactly 1 px of path apart, so "k px back" is exact. The rest
      // of a move (under a pixel) waits for the next one.
      const dx = x - lastX;
      const dy = y - lastY;
      const length = Math.hypot(dx, dy);
      const steps = Math.floor(length);
      if (steps < 1) return;
      const ux = dx / length;
      const uy = dy / length;
      for (let s = 1; s <= steps; s++) push(lastX + ux * s, lastY + uy * s);
      lastX += ux * steps;
      lastY += uy * steps;
    },

    pointBehind(distance, out) {
      const back = Math.min(capacity - 1, Math.max(0, Math.round(distance)));
      const at = (head - back + capacity) % capacity;
      out.x = xs[at]!;
      out.y = ys[at]!;
      return out;
    },
  };
  trail.reset(0, GROUND_Y);
  return trail;
}

/**
 * How each kind of animal follows its spot on the path. Land animals walk on
 * it; sky (hover) and water (bob) come later. Unknown kinds walk.
 */
export type MovementFn = (onPath: Point, timeS: number, phase: number, out: Point) => Point;

const land: MovementFn = (onPath, _t, _phase, out) => {
  out.x = onPath.x;
  out.y = onPath.y;
  return out;
};

export const MOVEMENT_STRATEGIES: Partial<Record<Movement, MovementFn>> = { land };

export const movementFor = (movement: Movement): MovementFn =>
  MOVEMENT_STRATEGIES[movement] ?? land;
