// The cute face the hand-tuned plans share: a dark 2 x 2 eye with a glint
// (the eye slot) and a pink blush (the accent) below and behind it.
import { get, rect, set, type Grid } from './grid.ts';

/** The eye's top-left pixel at (x, y); the glint sits top-right. */
export function cuteEye(g: Grid, x: number, y: number): void {
  rect(g, x, y, x + 1, y + 1, 'o');
  set(g, x + 1, y, 'e');
}

/** Two pink pixels on the cheek, only over the body. */
export function blush(g: Grid, x: number, y: number): void {
  for (const bx of [x, x + 1]) if (get(g, bx, y) !== '.') set(g, bx, y, 'a');
}
