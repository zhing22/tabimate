// Swimmers seen side-on, facing right: fish, sharks, rays, whales, dolphins,
// seals and sea cows. The tail beats through the cycle; on land (walk, in a
// bubble) they keep swimming.
import { ellipse, line, rect, set, swing, type Grid, type Pose } from './grid.ts';

export interface FishSpec {
  readonly plan: 'fish';
  readonly body?: readonly [w: number, h: number];
  /** fin: an upright forked fin; flukes: a whale's flat tail; whip: a ray's thin tail. */
  readonly tail?: 'fin' | 'flukes' | 'whip';
  readonly dorsal?: 'tall' | 'small' | 'none';
  readonly snout?: number;
  readonly flippers?: boolean;
  readonly stripes?: boolean;
}

const CY = 12;

export function drawFish(g: Grid, pose: Pose, spec: FishSpec): void {
  const [w, h] = spec.body ?? [12, 5];
  const cx = 12;
  const [rx, ry] = [(w - 1) / 2, (h - 1) / 2];
  const cy = CY + (pose.phase % 2);
  const [x0, x1, top, bottom] = [cx - rx, cx + rx, cy - ry, cy + ry];
  const wag = swing(pose.phase);

  tail(g, spec.tail ?? 'fin', Math.floor(x0) + 1, Math.round(cy), wag);
  ellipse(g, cx, cy, rx, ry, 'b');
  if (spec.snout) rect(g, x1 + 1, cy, x1 + spec.snout, cy + 1, 'b');
  if (spec.dorsal === 'tall')
    for (let x = cx - 2; x <= cx; x++) line(g, x, top, cx - 3, top - 4, 'b');
  else if (spec.dorsal !== 'none') rect(g, cx - 1, top - 1, cx, top - 1, 'b');
  if (spec.flippers) line(g, cx + 2, bottom, cx + 1 - wag, bottom + 3, 'b');
  else set(g, cx + 2, bottom + 1, 'b');
  if (spec.stripes)
    for (let x = Math.round(x0) + 3; x < x1 - 2; x += 3) rect(g, x, top + 1, x, bottom - 1, 'a');
  set(g, x1 - 2, cy - 1, 'e');
}

function tail(g: Grid, kind: NonNullable<FishSpec['tail']>, x: number, y: number, wag: number) {
  if (kind === 'fin') for (let t = -3; t <= 3; t++) line(g, x, y, x - 3, y + t + wag, 'b');
  else if (kind === 'flukes') {
    rect(g, x - 3, y, x, y + 1, 'b');
    rect(g, x - 5, y - 1 + wag, x - 4, y + 2 + wag, 'b');
  } else line(g, x, y, x - 6, y + wag, 'a');
}
