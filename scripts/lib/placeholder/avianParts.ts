// A bird's beak and tail, each a registry by shape: a new shape is a new
// entry. Beaks start at the front of the head (x, y = its middle row) and
// point right; tails start at the rump. Crests: avianCrests.ts.
import { PLACEHOLDER_ART } from '../../../src/config/placeholderArt.ts';
import type { AvianFrame } from './avian.ts';
import { ellipse, line, rect, set, type Grid, type Key } from './grid.ts';

export type BeakShape =
  | 'short'
  | 'hook'
  | 'bighook'
  | 'dagger'
  | 'needle'
  | 'sword'
  | 'flat'
  | 'pouch'
  | 'big'
  | 'puffin'
  | 'shoe'
  | 'down'
  | 'bent';

type Beak = (g: Grid, x: number, y: number, k: Key) => void;

export const BEAKS: Readonly<Record<BeakShape, Beak>> = {
  short: (g, x, y, k) => {
    rect(g, x, y - 1, x, y, k);
    set(g, x + 1, y, k);
  },
  hook: (g, x, y, k) => {
    rect(g, x, y - 1, x + 1, y, k);
    set(g, x + 1, y + 1, k);
  },
  bighook: (g, x, y, k) => {
    rect(g, x, y - 1, x + 1, y + 1, k);
    rect(g, x + 2, y, x + 2, y + 1, k);
  },
  dagger: (g, x, y, k) => {
    line(g, x, y - 1, x + 4, y, k);
    line(g, x, y, x + 3, y, k);
  },
  needle: (g, x, y, k) => line(g, x, y, x + 4, y, k),
  sword: (g, x, y, k) => line(g, x, y, x + 6, y + 1, k),
  flat: (g, x, y, k) => rect(g, x, y - 1, x + 2, y, k),
  pouch: (g, x, y, k) => {
    rect(g, x, y - 1, x + 4, y - 1, k);
    rect(g, x, y, x + 3, y + 2, k);
  },
  big: (g, x, y, k) => {
    rect(g, x, y - 2, x + 3, y + 1, k);
    set(g, x + 4, y, k);
    line(g, x, y - 2, x + 3, y - 2, 'h'); // a pale top edge (a toucan's or hornbill's)
  },
  puffin: (g, x, y, k) => {
    rect(g, x, y - 2, x + 1, y + 2, k);
    rect(g, x + 2, y - 1, x + 2, y + 1, k);
    rect(g, x, y - 2, x, y + 2, 'h'); // the pale band at its base
  },
  shoe: (g, x, y, k) => {
    rect(g, x, y - 2, x + 3, y + 2, k);
    set(g, x + 4, y + 2, k);
  },
  down: (g, x, y, k) => line(g, x, y, x + 4, y + 3, k),
  bent: (g, x, y, k) => {
    line(g, x, y - 1, x + 2, y - 1, k);
    line(g, x + 2, y, x + 3, y + 2, 'o'); // the black, bent tip
  },
};

export type TailShape = 'short' | 'long' | 'fork' | 'fan' | 'train' | 'none';
type Tail = (g: Grid, f: AvianFrame, len: number, k: Key) => void;

/** The rump, and which way the tail goes from it: down and back when perched, back otherwise. */
const rump = (f: AvianFrame): [number, number, number] =>
  f.upright ? [f.bx - f.rx + 1, f.by + f.ry - 1, 1] : [f.bx - f.rx, f.by - 1, 0];

/** Two pixels wide, never below the ground line (a perched bird's tail stops at the ground). */
const thick = (g: Grid, x0: number, y0: number, x1: number, y1: number, k: Key) => {
  const end = Math.min(y1, PLACEHOLDER_ART.groundY);
  line(g, x0, y0, x1, end, k);
  line(g, x0 + 1, y0, x1 + 1, end, k);
};

export const TAILS: Readonly<Record<TailShape, Tail>> = {
  none: () => {},
  short: (g, f, len, k) => {
    const [x, y, down] = rump(f);
    thick(g, x, y, x - len, y + (down ? len : 0), k);
  },
  long: (g, f, len, k) => {
    const [x, y, down] = rump(f);
    thick(g, x, y, x - Math.round(len * 0.7), y + (down ? Math.round(len * 0.7) : -1), k);
  },
  fork: (g, f, len, k) => {
    const [x, y] = rump(f);
    line(g, x, y, x - len, y - 2, k);
    line(g, x, y, x - len, Math.min(y + 2, PLACEHOLDER_ART.groundY), k);
  },
  // Fanned up behind the back (a turkey's).
  fan: (g, f, len, k) => {
    ellipse(g, f.bx - f.rx + 1, f.by - f.ry - 1, len / 2 + 1, len / 2 + 1, k);
    for (const dx of [-2, 0, 2]) set(g, f.bx - f.rx + 1 + dx, f.by - f.ry - len / 2, 'h');
  },
  // A long train trailing behind, dotted with eyespots (a peacock's).
  train: (g, f, len, k) => {
    const [x, y] = rump(f);
    rect(g, x - len, y - 1, x, y + 1, k);
    for (let dx = 1; dx < len; dx += 2) set(g, x - dx, y - 1 + (dx % 4 === 1 ? 1 : 0), 'a');
  },
};
