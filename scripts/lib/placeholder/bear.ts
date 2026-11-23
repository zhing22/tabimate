// Bears, walking on all fours, facing right: a heavy body with a shoulder
// hump, round ears, a short muzzle. Drawn in their own colours rather than
// auto-shaded: fur (base), far legs and belly (shadow), muzzle (highlight),
// the species' pattern (accent), eye; the nose is outline-dark. Palettes make
// the species (palettes.json).
import { PLACEHOLDER_ART } from '../../../src/config/placeholderArt.ts';
import { ellipse, get, line, rect, set, swing, type Grid, type Key, type Pose } from './grid.ts';

export interface BearSpec {
  readonly plan: 'bear';
  /**
   * plain: brown, American black and polar bears (one fur, a lighter muzzle);
   * panda: black legs, shoulder band, ears and eye patches on white;
   * chest: Asian black, sun and sloth bears (a pale chest mark, a ruff);
   * spectacled: pale rings round the eyes running down to the throat.
   */
  readonly look: 'plain' | 'panda' | 'chest' | 'spectacled';
}

interface Body {
  readonly x0: number;
  readonly x1: number;
  readonly top: number;
  readonly bottom: number;
  readonly hx: number;
  readonly hy: number;
}

const LEN = 13;
const HIGH = 7;
const LEG = 3;

export function drawBear(g: Grid, pose: Pose, spec: BearSpec): void {
  const ground = PLACEHOLDER_ART.groundY;
  const s = swing(pose.phase);
  const bottom = ground - LEG + (pose.phase % 2);
  const x0 = 4;
  const x1 = x0 + LEN - 1;
  const top = bottom - HIGH + 1;
  const b: Body = { x0, x1, top, bottom, hx: x1 + 1, hy: top - 1 };
  const legs: Key = spec.look === 'panda' ? 'a' : 'b';

  legPair(g, b, [x0 + 3, x1 - 2], -s, ground, spec.look === 'panda' ? 'a' : 's'); // far side
  set(g, x0 - 1, top + 1, 'b'); // tail
  ellipse(g, (x0 + x1) / 2, (top + bottom) / 2, (LEN - 1) / 2, (HIGH - 1) / 2, 'b');
  ellipse(g, x1 - 3, top, 2.5, 1.5, 'b'); // shoulder hump
  for (let x = x0 + 2; x <= x1 - 2; x++) paint(g, x, bottom, 's'); // belly in shade
  legPair(g, b, [x0 + 1, x1 - 4], s, ground, legs); // near side
  head(g, b);
  MARKS[spec.look](g, b);
  set(g, b.hx + 1, b.hy - 1, 'e');
}

/** Two legs, two px wide, standing on the ground; one swings forward and lifts. */
function legPair(g: Grid, b: Body, xs: readonly number[], s: number, ground: number, k: Key) {
  xs.forEach((x, i) => {
    const dx = i === 0 ? s : -s;
    rect(g, x + dx, b.bottom, x + dx + 1, ground - (dx > 0 ? 1 : 0), k);
  });
}

function head(g: Grid, { hx, hy }: Body): void {
  ellipse(g, hx - 2, hy - 3, 1, 1, 'b'); // ear
  ellipse(g, hx, hy, 3, 2.5, 'b');
  rect(g, hx + 3, hy, hx + 4, hy + 1, 'h'); // muzzle
  set(g, hx + 4, hy, 'o'); // nose
}

/** Recolours a pixel of the bear, leaving the space around it empty. */
function paint(g: Grid, x: number, y: number, k: Key): void {
  if (get(g, x, y) !== '.') set(g, x, y, k);
}

/** The chest mark's rows, as x offsets from the chest front, top row first. */
const CHEST_ROWS: readonly (readonly [number, number])[] = [
  [-3, 0],
  [-3, 0],
  [-2, -1],
];

/** Each look's pattern, a registry by look. */
const MARKS: Readonly<Record<BearSpec['look'], (g: Grid, b: Body) => void>> = {
  plain: () => {},
  panda: (g, { x1, top, bottom, hx, hy }) => {
    for (let y = top - 2; y <= bottom; y++)
      for (let x = x1 - 5; x <= x1 - 3; x++) paint(g, x, y, 'a'); // shoulder band
    ellipse(g, hx - 2, hy - 3, 1, 1, 'a'); // ear
    ellipse(g, hx + 1, hy - 1, 1, 1, 'a'); // eye patch
  },
  chest: (g, { x1, top, hx, hy }) => {
    // A V (or U) across the chest under the head, narrowing as it goes down...
    CHEST_ROWS.forEach(([from, to], i) => {
      for (let x = x1 + from; x <= x1 + to; x++) paint(g, x, top + 2 + i, 'a');
    });
    for (let x = hx - 1; x <= hx; x++) paint(g, x, hy + 2, 'a'); // ...up to the throat
    line(g, x1 - 6, top - 1, x1 - 4, top - 2, 'b'); // a shaggy ruff over the shoulders
  },
  spectacled: (g, { hx, hy }) => {
    ellipse(g, hx + 1, hy - 1, 1, 1, 'a'); // a pale ring round the eye...
    line(g, hx + 2, hy, hx + 1, hy + 2, 'a'); // ...running down to the throat
  },
};
