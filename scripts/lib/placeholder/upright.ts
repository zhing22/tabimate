// Standing on two legs, facing right: apes, monkeys, gibbons, penguins.
// Swimming (penguins) is the standing pose turned to lie belly-down.
import { PLACEHOLDER_ART } from '../../../src/config/placeholderArt.ts';
import { ellipse, line, rect, set, swing, type Grid, type Pose } from './grid.ts';

export interface UprightSpec {
  readonly plan: 'upright';
  readonly body?: readonly [w: number, h: number];
  readonly leg?: number;
  readonly head?: number;
  readonly arms?: 'short' | 'long' | 'flippers';
  readonly tail?: 'curl' | 'none';
  readonly beak?: boolean;
  /** A patch of accent down the front. */
  readonly belly?: boolean;
  readonly ears?: boolean;
}

export function drawUpright(g: Grid, pose: Pose, spec: UprightSpec): void {
  const [w, h] = spec.body ?? [6, 8];
  const leg = spec.leg ?? 3;
  const head = spec.head ?? 2.5;
  const s = swing(pose.phase);
  const cx = 11;
  const bottom = PLACEHOLDER_ART.groundY - leg + (pose.phase % 2);
  const top = bottom - h + 1;
  const [rx, ry] = [(w - 1) / 2, (h - 1) / 2];
  const cy = (top + bottom) / 2;
  const [hx, hy] = [cx + 1, top - head + 1];

  if (spec.tail === 'curl') {
    line(g, cx - rx, bottom - 1, cx - rx - 4, bottom - 2, 'b');
    line(g, cx - rx - 4, bottom - 2, cx - rx - 4, bottom - 5, 'b');
  }
  // Legs step in turn: the forward one lifts.
  const ground = PLACEHOLDER_ART.groundY;
  rect(g, cx - 1 - s, bottom, cx - 1 - s, ground - (s < 0 ? 1 : 0), 'b');
  rect(g, cx + 1 + s, bottom, cx + 1 + s, ground - (s > 0 ? 1 : 0), 'b');
  ellipse(g, cx, cy, rx, ry, 'b');
  if (spec.belly) ellipse(g, cx + 1, cy + 1, Math.max(1, rx - 1.5), Math.max(1, ry - 1.5), 'a');
  arms(g, spec.arms ?? 'short', cx + rx, top + 2, s);
  ellipse(g, hx, hy, head, head, 'b');
  if (spec.ears) [hx - head, hx + head].forEach((x) => set(g, x, hy, 'b'));
  if (spec.beak) rect(g, hx + head + 1, hy, hx + head + 2, hy, 'a');
  set(g, hx + 1, hy - 1, 'e');
  if (pose.mode === 'swim') rotateClockwise(g);
}

function arms(g: Grid, kind: NonNullable<UprightSpec['arms']>, x: number, y: number, s: number) {
  if (kind === 'short') line(g, x, y, x + 1 + s, y + 4, 'b');
  else if (kind === 'long') line(g, x, y, x + 2 + s, PLACEHOLDER_ART.groundY - 2, 'b');
  else line(g, x, y, x + 2, y + 3 + s * 2, 'b');
}

/** Turns the frame a quarter clockwise: head to the right, front facing down. */
export function rotateClockwise(g: Grid): void {
  const old = g.cells.map((row) => [...row]);
  for (let y = 0; y < g.size; y++)
    for (let x = 0; x < g.size; x++) g.cells[y]![x] = old[g.size - 1 - x]![y]!;
}
