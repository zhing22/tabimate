// Four legs, facing right: cats, dogs, hoofed animals, elephants, lizards,
// tortoises, hopping hares and kangaroos. Features say what's added to the body.
import { PLACEHOLDER_ART } from '../../../src/config/placeholderArt.ts';
import { ellipse, line, rect, set, swing, type Grid, type Pose } from './grid.ts';

export interface QuadrupedSpec {
  readonly plan: 'quadruped';
  /** Body length and height in px. */
  readonly body?: readonly [w: number, h: number];
  readonly leg?: number;
  /** Head radius. */
  readonly head?: number;
  readonly neck?: number;
  readonly snout?: number;
  readonly tail?: 'long' | 'short' | 'bushy' | 'thick' | 'none';
  readonly ears?: 'point' | 'round' | 'long' | 'none';
  readonly horns?: 'antlers' | 'horns' | 'nose';
  readonly trunk?: boolean;
  readonly hump?: boolean;
  readonly shell?: boolean;
  readonly pattern?: 'stripes' | 'spots' | 'back' | 'mane';
  /** Moves by hopping, both legs together (hares, kangaroos, frogs). */
  readonly hop?: boolean;
}

interface Frame {
  x0: number;
  x1: number;
  top: number;
  bottom: number;
  cx: number;
  hx: number;
  hy: number;
  head: number;
}

const HOP_LIFT = [0, 2, 3, 1];

export function drawQuadruped(g: Grid, pose: Pose, spec: QuadrupedSpec): void {
  const [w, h] = spec.body ?? [12, 5];
  const leg = spec.leg ?? 4;
  const head = spec.head ?? 2;
  const ground = PLACEHOLDER_ART.groundY;
  const lift = spec.hop ? HOP_LIFT[pose.phase % 4]! : 0;
  const dy = (pose.mode === 'walk' && !spec.hop ? pose.phase % 2 : 0) - lift;
  const cx = 11;
  const x0 = Math.round(cx - w / 2);
  const x1 = x0 + w - 1;
  const bottom = ground - leg + dy;
  const top = bottom - h + 1;
  const hy = top - (spec.neck ?? 0) - 1;
  const f: Frame = { x0, x1, top, bottom, cx, hx: x1 + head - 1, hy, head };

  tail(g, f, spec.tail ?? 'long');
  ellipse(g, (x0 + x1) / 2, (top + bottom) / 2, (w - 1) / 2, (h - 1) / 2, 'b');
  legs(g, f, pose, spec.hop === true);
  if (spec.neck) rect(g, x1 - 1, hy, x1, top + 1, 'b');
  if (spec.pattern === 'mane') ellipse(g, f.hx - 1, hy, head + 1, head + 1, 'a');
  ellipse(g, f.hx, hy, head, head, 'b');
  if (spec.snout) rect(g, f.hx + head, hy, f.hx + head + spec.snout - 1, hy + 1, 'b');
  ears(g, f, spec.ears ?? 'point');
  extras(g, f, spec);
  pattern(g, f, spec.pattern);
  set(g, f.hx + 1, hy - 1, 'e');
}

/** Feet stand on the ground line however the body bobs; a forward foot lifts. */
function legs(g: Grid, f: Frame, pose: Pose, hop: boolean): void {
  const s = swing(pose.phase) * (pose.mode === 'swim' ? 2 : 1);
  const xs = [f.x0 + 1, f.x0 + 3, f.x1 - 3, f.x1 - 1];
  xs.forEach((x, i) => {
    const dx = hop ? 0 : i % 3 === 0 ? s : -s;
    const end = hop ? f.bottom + 2 : PLACEHOLDER_ART.groundY - (dx > 0 ? 1 : 0);
    rect(g, x + dx, f.bottom, x + dx, end, 'b');
  });
  // A hopper's big hind foot.
  if (hop) rect(g, f.x0 + 1, f.bottom + 2, f.x0 + 3, f.bottom + 2, 'b');
}

function tail(g: Grid, f: Frame, kind: NonNullable<QuadrupedSpec['tail']>): void {
  const { x0, top, bottom } = f;
  const mid = Math.round((top + bottom) / 2);
  if (kind === 'long') line(g, x0, top + 1, x0 - 3, top - 2, 'b');
  else if (kind === 'short') set(g, x0 - 1, top + 1, 'b');
  else if (kind === 'bushy') ellipse(g, x0 - 2, top, 1.5, 2, 'b');
  else if (kind === 'thick') {
    rect(g, x0 - 2, mid, x0, bottom, 'b');
    line(g, x0 - 2, bottom, x0 - 4, Math.min(bottom + 1, PLACEHOLDER_ART.groundY), 'b');
  }
}

function ears(g: Grid, f: Frame, kind: NonNullable<QuadrupedSpec['ears']>): void {
  const { hx, hy, head } = f;
  const up = hy - head;
  if (kind === 'point') [hx - 1, hx + 1].forEach((x) => set(g, x, up - 1, 'b'));
  else if (kind === 'round') ellipse(g, hx - 1, up, 1, 1, 'b');
  else if (kind === 'long') {
    rect(g, hx - 1, up - 4, hx - 1, up, 'b');
    rect(g, hx, up - 3, hx, up, 'b');
  }
}

function extras(g: Grid, f: Frame, spec: QuadrupedSpec): void {
  const { hx, hy, head, cx, top } = f;
  const front = hx + head + (spec.snout ?? 0);
  if (spec.horns === 'antlers') {
    line(g, hx - 1, hy - head, hx - 2, hy - head - 4, 'a');
    line(g, hx - 2, hy - head - 2, hx - 4, hy - head - 3, 'a');
  } else if (spec.horns === 'horns') line(g, hx, hy - head, hx - 2, hy - head - 3, 'a');
  else if (spec.horns === 'nose') line(g, front - 1, hy - 1, front - 1, hy - 3, 'a');
  if (spec.trunk) {
    rect(g, front, hy, front + 1, hy + 1, 'b');
    line(g, front + 1, hy + 1, front + 1, f.bottom + 2, 'b');
  }
  if (spec.hump) ellipse(g, cx, top - 1, 2, 1.5, 'b');
  if (spec.shell) ellipse(g, cx, top + 1, (f.x1 - f.x0) / 2, (f.bottom - top) / 2 + 1, 'a');
}

function pattern(g: Grid, f: Frame, kind: QuadrupedSpec['pattern']): void {
  const { x0, x1, top } = f;
  if (kind === 'stripes')
    for (let x = x0 + 2; x < x1 - 1; x += 3) rect(g, x, top + 1, x, top + 2, 'a');
  else if (kind === 'spots')
    for (let x = x0 + 2, i = 0; x < x1 - 1; x += 3, i++) set(g, x, top + 1 + (i % 2), 'a');
  else if (kind === 'back') rect(g, x0 + 1, top, x1 - 1, top, 'a');
}
