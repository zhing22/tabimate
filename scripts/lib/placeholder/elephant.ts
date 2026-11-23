// Elephants, cute and chunky, walking, facing right: a round body on four
// stout legs with pale toenails, a big round head, a trunk that curls up at
// the tip and swings, a tufted tail, the cute face (face.ts). Each species
// has what sets it apart: the African's huge ears and curved tusks, the
// forest elephant's round ears and straight tusks, the Asian's small ears,
// domed head, arched back and pink freckles.
// Slots: skin (base), far legs and ear (shadow), tusks and toenails
// (highlight), blush and freckles (accent), the eye's glint (eye).
import { PLACEHOLDER_ART } from '../../../src/config/placeholderArt.ts';
import { blush, cuteEye } from './face.ts';
import { ellipse, get, line, rect, set, swing, type Grid, type Key, type Pose } from './grid.ts';

export interface ElephantSpec {
  readonly plan: 'elephant';
  readonly look: 'african' | 'forest' | 'asian';
}

interface Look {
  /** The ear over the side of the head: centre offset from the head, radii. */
  readonly ear: readonly [dx: number, dy: number, rx: number, ry: number];
  readonly tusks: (g: Grid, x: number, y: number) => void;
  readonly extra?: (g: Grid, at: { headX: number; headY: number; bodyTop: number }) => void;
}

const LOOKS: Readonly<Record<ElephantSpec['look'], Look>> = {
  african: {
    ear: [-4, 0, 3, 4],
    tusks: (g, x, y) => line(g, x, y, x + 3, y + 2, 'h'), // long and curving forward
  },
  forest: {
    ear: [-3, 0, 2.5, 3],
    tusks: (g, x, y) => line(g, x, y, x, y + 2, 'h'), // straight down
  },
  asian: {
    ear: [-3, 1, 2, 2.5],
    tusks: (g, x, y) => set(g, x, y, 'h'), // barely there
    extra: (g, { headX, headY, bodyTop }) => {
      ellipse(g, headX - 1, headY - 4, 1.5, 1, 'b'); // twin domes on the head
      ellipse(g, headX + 1, headY - 4, 1.5, 1, 'b');
      ellipse(g, 9, bodyTop, 3, 1.5, 'b'); // the arched back
      for (const [dx, dy] of [
        [-4, -1],
        [-3, 1],
        [3, 2],
      ] as const)
        if (get(g, headX + dx, headY + dy) !== '.') set(g, headX + dx, headY + dy, 'a'); // freckles
    },
  },
};

export function drawElephant(g: Grid, pose: Pose, spec: ElephantSpec): void {
  const look = LOOKS[spec.look];
  const ground = PLACEHOLDER_ART.groundY;
  const s = swing(pose.phase);
  const dip = pose.phase % 2;
  const bodyTop = 11 + dip;
  const [headX, headY] = [15, 10 + dip];

  line(g, 3, bodyTop + 2, 1, bodyTop + 5, 'b'); // tail
  set(g, 1, bodyTop + 6, 'o'); // its tuft
  legs(g, [6, 13], -s, ground, bodyTop + 5, 's'); // far side
  ellipse(g, 9, bodyTop + 4, 6, 4, 'b');
  legs(g, [4, 11], s, ground, bodyTop + 5, 'b'); // near side
  ellipse(g, headX, headY, 4, 4, 'b');
  const [ex, ey, rx, ry] = look.ear;
  ellipse(g, headX + ex, headY + ey, rx, ry, 's');
  // The trunk, swinging, its tip curled up.
  rect(g, headX + 4, headY + 1, headX + 5, headY + 6, 'b');
  rect(g, headX + 4 + s, headY + 6, headX + 5 + s, headY + 7, 'b');
  set(g, headX + 6 + s, headY + 6, 'b');
  look.tusks(g, headX + 3, headY + 3); // in front of the trunk
  look.extra?.(g, { headX, headY, bodyTop });
  cuteEye(g, headX, headY - 2);
  blush(g, headX - 1, headY + 1);
}

/** Two stout legs, two px wide, toenails pale; the forward one lifts. */
function legs(g: Grid, xs: readonly number[], s: number, ground: number, top: number, k: Key) {
  xs.forEach((x, i) => {
    const dx = i === 0 ? s : -s;
    const foot = ground - (dx > 0 ? 1 : 0);
    rect(g, x + dx, top, x + dx + 1, foot, k);
    if (k === 'b') set(g, x + dx + 1, foot, 'h');
  });
}
