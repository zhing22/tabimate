// Birds and bats, facing right: standing on thin legs (walk), or in the air
// with legs tucked and a wing beating up, level, down, level (flap).
import { PLACEHOLDER_ART } from '../../../src/config/placeholderArt.ts';
import { ellipse, line, rect, set, swing, type Grid, type Pose } from './grid.ts';

export interface BirdSpec {
  readonly plan: 'bird';
  readonly body?: readonly [w: number, h: number];
  readonly leg?: number;
  readonly head?: number;
  readonly neck?: number;
  readonly beak?: 'short' | 'hook' | 'long' | 'big' | 'flat' | 'pouch' | 'none';
  readonly tail?: number;
  readonly crest?: boolean;
  /** Ear tufts (owls) or ears (bats). */
  readonly ears?: boolean;
  /** How far the wing reaches from the shoulder. */
  readonly wing?: number;
}

/** Where the wing tip sits through a beat: up, level, down, level. */
const BEAT = [-1, 0, 1, 0];
const FLY_Y = 12;

export function drawBird(g: Grid, pose: Pose, spec: BirdSpec): void {
  const [w, h] = spec.body ?? [8, 5];
  const head = spec.head ?? 2;
  const flying = pose.mode === 'flap';
  const leg = flying ? 1 : (spec.leg ?? 3);
  const cx = 11;
  const [rx, ry] = [(w - 1) / 2, (h - 1) / 2];
  const cy = flying ? FLY_Y : PLACEHOLDER_ART.groundY - leg - ry + (pose.phase % 2);
  const [x0, x1, top] = [cx - rx, cx + rx, cy - ry];
  const [hx, hy] = [x1, top - (spec.neck ?? 0) - head + 1];

  const tail = spec.tail ?? 2;
  if (tail > 0) rect(g, x0 - tail, cy - 1, x0, cy, 'b');
  if (flying) line(g, x0 + 1, cy + ry, x0 - 1, cy + ry + 1, 'b');
  else {
    const s = swing(pose.phase);
    const ground = PLACEHOLDER_ART.groundY;
    line(g, cx - 1, cy + ry, cx - 1 - s, ground, 'b');
    line(g, cx + 1, cy + ry, cx + 1 + s, ground, 'b');
  }
  ellipse(g, cx, cy, rx, ry, 'b');
  if (spec.neck) rect(g, hx - 1, hy, hx, top + 1, 'b');
  ellipse(g, hx, hy, head, head, 'b');
  if (spec.crest) line(g, hx - 1, hy - head, hx - 3, hy - head - 2, 'a');
  if (spec.ears) [hx - head, hx + head - 1].forEach((x) => set(g, x, hy - head - 1, 'b'));
  beak(g, spec.beak ?? 'short', hx + head + 1, hy);
  set(g, hx + 1, hy - 1, 'e');
  if (flying) wing(g, cx, top, spec.wing ?? 6, BEAT[pose.phase % 4]!);
  else ellipse(g, cx - 1, cy, Math.max(1, rx - 1.5), Math.max(0.5, ry - 1), 's');
}

function beak(g: Grid, kind: NonNullable<BirdSpec['beak']>, x: number, y: number): void {
  if (kind === 'short') set(g, x, y, 'a');
  else if (kind === 'hook') rect(g, x, y, x, y + 1, 'a');
  else if (kind === 'long') line(g, x, y, x + 3, y + 1, 'a');
  else if (kind === 'big') rect(g, x, y - 1, x + 3, y + 1, 'a');
  else if (kind === 'flat') rect(g, x, y, x + 1, y + 1, 'a');
  else if (kind === 'pouch') {
    rect(g, x, y, x + 4, y, 'a');
    rect(g, x, y + 1, x + 3, y + 2, 'a');
  }
}

/** A fan of lines from the shoulder to the tip: the near wing, in shadow so it stands out. */
function wing(g: Grid, cx: number, top: number, reach: number, beat: number): void {
  const tipX = cx - Math.round(reach * (beat === 0 ? 1 : 0.6));
  const tipY = beat === 0 ? top - 2 : top + beat * Math.round(reach * 0.8);
  for (let x = cx - 2; x <= cx + 2; x++) line(g, x, top, tipX, tipY, 's');
}
