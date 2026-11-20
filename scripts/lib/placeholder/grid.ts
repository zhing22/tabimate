// A frame being drawn: a square of template slot keys. Plans paint body ('b'),
// accent ('a') and eye ('e'); shade() and outline() finish it like the sample
// sheet (lit top, shadowed underside, a one-pixel outline).
import { PLACEHOLDER_ART } from '../../../src/config/placeholderArt.ts';

/** outline, base, shadow, highlight, accent, eye (TEMPLATE_KEYS order), or empty. */
export type Key = 'o' | 'b' | 's' | 'h' | 'a' | 'e' | '.';
export const SLOT: Record<Exclude<Key, '.'>, number> = { o: 0, b: 1, s: 2, h: 3, a: 4, e: 5 };

export interface Grid {
  readonly size: number;
  readonly cells: Key[][];
}

/** What a plan draws: a frame of one tag. */
export interface Pose {
  readonly mode: 'walk' | 'flap' | 'swim';
  /** 0 to framesPerTag - 1. */
  readonly phase: number;
}

export const createGrid = (size: number = PLACEHOLDER_ART.size): Grid => ({
  size,
  cells: Array.from({ length: size }, () => Array<Key>(size).fill('.')),
});

export const get = (g: Grid, x: number, y: number): Key => g.cells[y]?.[x] ?? '.';

export function set(g: Grid, x: number, y: number, k: Key): void {
  const row = g.cells[Math.round(y)];
  const cx = Math.round(x);
  if (row && cx >= 0 && cx < g.size) row[cx] = k;
}

export function rect(g: Grid, x0: number, y0: number, x1: number, y1: number, k: Key): void {
  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) set(g, x, y, k);
}

/** A filled ellipse centred on (cx, cy) with radii rx, ry (half-pixels allowed). */
export function ellipse(g: Grid, cx: number, cy: number, rx: number, ry: number, k: Key): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / (rx + 0.5);
      const dy = (y - cy) / (ry + 0.5);
      if (dx * dx + dy * dy <= 1) set(g, x, y, k);
    }
}

/** A one-pixel line (Bresenham). */
export function line(g: Grid, x0: number, y0: number, x1: number, y1: number, k: Key): void {
  let [x, y] = [Math.round(x0), Math.round(y0)];
  const [tx, ty] = [Math.round(x1), Math.round(y1)];
  const [dx, dy] = [Math.abs(tx - x), -Math.abs(ty - y)];
  const [sx, sy] = [x < tx ? 1 : -1, y < ty ? 1 : -1];
  let err = dx + dy;
  for (;;) {
    set(g, x, y, k);
    if (x === tx && y === ty) return;
    const e2 = 2 * err;
    if (e2 >= dy) [err, x] = [err + dy, x + sx];
    if (e2 <= dx) [err, y] = [err + dx, y + sy];
  }
}

const isEmpty = (g: Grid, x: number, y: number) => get(g, x, y) === '.';

/** Body pixels with nothing above are lit, with nothing below in shadow. */
export function shade(g: Grid): void {
  const next = g.cells.map((row, y) =>
    row.map((k, x) => {
      if (k !== 'b') return k;
      if (isEmpty(g, x, y - 1)) return 'h';
      return isEmpty(g, x, y + 1) ? 's' : 'b';
    }),
  );
  next.forEach((row, y) => (g.cells[y] = row));
}

/** Every empty pixel touching the drawing becomes outline. */
export function outline(g: Grid): void {
  const drawn = (x: number, y: number) => {
    const k = get(g, x, y);
    return k !== '.' && k !== 'o';
  };
  for (let y = 0; y < g.size; y++)
    for (let x = 0; x < g.size; x++)
      if (
        isEmpty(g, x, y) &&
        (drawn(x - 1, y) || drawn(x + 1, y) || drawn(x, y - 1) || drawn(x, y + 1))
      )
        g.cells[y]![x] = 'o';
}

/** A limb's swing through a 4-frame cycle: still, forward, still, back. */
export const swing = (phase: number): number => [0, 1, 0, -1][phase % 4]!;
