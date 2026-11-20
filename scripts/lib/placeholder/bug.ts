// Many legs, facing right: insects, spiders, scorpions, crabs. Winged ones
// lift off and beat their wings in the flap tag.
import { PLACEHOLDER_ART } from '../../../src/config/placeholderArt.ts';
import { ellipse, line, rect, set, swing, type Grid, type Pose } from './grid.ts';

export interface BugSpec {
  readonly plan: 'bug';
  readonly body?: readonly [w: number, h: number];
  readonly legs?: 6 | 8 | 10;
  readonly wings?: 'butterfly' | 'buzz' | 'none';
  readonly claws?: boolean;
  readonly stinger?: boolean;
  readonly antennae?: boolean;
  /** A hard back in the accent colour (beetles). */
  readonly shell?: boolean;
  readonly stripes?: boolean;
}

const FLY_Y = 12;

export function drawBug(g: Grid, pose: Pose, spec: BugSpec): void {
  const [w, h] = spec.body ?? [8, 3];
  const flying = pose.mode === 'flap';
  const cx = 10;
  const [rx, ry] = [(w - 1) / 2, (h - 1) / 2];
  const ground = PLACEHOLDER_ART.groundY;
  const cy = flying ? FLY_Y : ground - 2 - ry;
  const [x0, x1, top, bottom] = [cx - rx, cx + rx, cy - ry, cy + ry];
  const s = swing(pose.phase);

  const pairs = (spec.legs ?? 6) / 2;
  for (let i = 0; i < pairs; i++) {
    const x = Math.round(x0 + 1 + (i * (w - 2)) / Math.max(1, pairs - 1));
    const dx = i % 2 === 0 ? s : -s;
    line(g, x, bottom, x + dx - 1, flying ? bottom + 2 : ground, 'b');
  }
  if (spec.stinger) {
    line(g, x0, cy, x0 - 2, top - 3, 'b');
    line(g, x0 - 2, top - 3, x0 + 1, top - 5, 'b');
    set(g, x0 + 2, top - 5, 'a');
  }
  ellipse(g, cx, cy, rx, ry, 'b');
  if (spec.shell) ellipse(g, cx - 0.5, cy - 0.5, rx - 0.5, ry, 'a');
  if (spec.stripes) for (let x = x0 + 1; x < x1; x += 2) rect(g, x, top, x, bottom, 'a');
  ellipse(g, x1 + 1.5, cy, 1.5, 1.5, 'b');
  if (spec.antennae) line(g, x1 + 2, top - 1, x1 + 4, top - 4, 'b');
  if (spec.claws) claws(g, x1 + 2, cy, s);
  set(g, x1 + 2, cy - 1, 'e');
  wings(g, spec.wings ?? 'none', cx - 1, top, flying ? pose.phase : 0);
}

function claws(g: Grid, x: number, y: number, s: number): void {
  line(g, x, y + 1, x + 3, y - 1 + s, 'b');
  rect(g, x + 3, y - 2 + s, x + 4, y - 1 + s, 'b');
  set(g, x + 5, y - 2 + s, 'b');
}

/** Wings over the back: open wide on even frames, half shut on odd ones. */
function wings(
  g: Grid,
  kind: NonNullable<BugSpec['wings']>,
  x: number,
  top: number,
  phase: number,
) {
  const open = phase % 2 === 0;
  if (kind === 'butterfly') {
    ellipse(g, x, top - 4, open ? 4 : 2, open ? 3.5 : 3, 'b');
    set(g, x, top - 4, 'a');
  } else if (kind === 'buzz') ellipse(g, x, top - 2, open ? 2.5 : 1.5, 1, 'h');
}
