// A bird's marks, a registry by name: each paints part of the body (before the
// head) or the face (after it). Looks list the marks they want; the species'
// palette colours them.
import type { AvianFrame } from './avian.ts';
import { ellipse, get, line, rect, set, type Grid, type Key } from './grid.ts';

interface Mark {
  readonly on: 'body' | 'face';
  readonly draw: (g: Grid, f: AvianFrame) => void;
}

/** Recolours a pixel of the bird only (never the air around it). */
const paint = (g: Grid, x: number, y: number, k: Key) => {
  if (get(g, Math.round(x), Math.round(y)) !== '.') set(g, x, y, k);
};
const paintEllipse = (g: Grid, cx: number, cy: number, rx: number, ry: number, k: Key) => {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
      if (((x - cx) / (rx + 0.5)) ** 2 + ((y - cy) / (ry + 0.5)) ** 2 <= 1) paint(g, x, y, k);
};
const eye = (f: AvianFrame): [number, number] => [Math.round(f.hx), Math.round(f.hy) - 2];

export type MarkName = keyof typeof MARKS;

export const MARKS = {
  /** A pale front: breast or belly (a robin's red breast is its palette's highlight). */
  breast: {
    on: 'body',
    draw: (g, f) =>
      paintEllipse(g, f.bx + (f.upright ? 1.5 : 1), f.by + 1, f.rx - 1.5, f.ry - 1.5, 'h'),
  },
  /** A band of the accent across the folded wing (or the back in flight). */
  wingbar: {
    on: 'body',
    draw: (g, f) => {
      for (let x = f.bx - f.rx + 1; x <= f.bx + 1; x++)
        if (get(g, x, Math.round(f.by)) === 's') set(g, x, f.by, 'a');
    },
  },
  /** Pale spots over the body (a starling's, a spotted kiwi's, a whale shark's cousin). */
  spots: {
    on: 'body',
    draw: (g, f) => {
      for (let x = f.bx - f.rx + 1; x < f.bx + f.rx; x += 2)
        paint(g, x, Math.round(f.by) + ((x >> 1) % 2 === 0 ? -1 : 1), 'h');
    },
  },
  /** A ruff in the accent where the neck meets the body (a condor's white one). */
  ruff: {
    on: 'body',
    draw: (g, f) => ellipse(g, f.hx - 0.5, f.hy + f.hr, f.hr - 0.5, 1, 'a'),
  },
  /** The accent on the crown. */
  cap: {
    on: 'face',
    draw: (g, f) => paintEllipse(g, f.hx - 0.5, f.hy - f.hr + 1, f.hr - 1, 1, 'a'),
  },
  /** A dark stripe through the eye. */
  mask: {
    on: 'face',
    draw: (g, f) => {
      const [x, y] = eye(f);
      for (let dx = -2; dx <= 2; dx++) paint(g, x + dx, y + 1, 'o');
    },
  },
  /** A falcon's dark "moustache" under the eye. */
  moustache: {
    on: 'face',
    draw: (g, f) => {
      const [x, y] = eye(f);
      rect(g, x, y + 2, x, y + 3, 'o');
    },
  },
  /** The accent on the throat (a hummingbird's gorget, a swallow's red throat). */
  throat: {
    on: 'face',
    draw: (g, f) => paintEllipse(g, f.hx + 1, f.hy + f.hr - 1, 1.5, 1, 'a'),
  },
  /** A frigatebird's red throat pouch, puffed out. */
  pouch: {
    on: 'body',
    draw: (g, f) => ellipse(g, f.bx + f.rx, f.by, 2, 2, 'a'),
  },
  /** An owl's pale face disc. */
  disc: {
    on: 'face',
    draw: (g, f) => ellipse(g, f.hx + 0.5, f.hy - 0.5, f.hr - 0.5, f.hr - 0.5, 'h'),
  },
  /** A pale ring round the eye. */
  eyering: {
    on: 'face',
    draw: (g, f) => {
      const [x, y] = eye(f);
      for (const [dx, dy] of [
        [-1, 0],
        [-1, 1],
        [2, 0],
        [2, 1],
        [0, -1],
        [1, -1],
        [0, 2],
        [1, 2],
      ] as const)
        paint(g, x + dx, y + dy, 'h');
    },
  },
  /** A pale cheek patch (a goose's chinstrap). */
  cheek: {
    on: 'face',
    draw: (g, f) => paintEllipse(g, f.hx - 0.5, f.hy + 1, 1.5, 1, 'h'),
  },
  /** A red wattle hanging under the beak (a turkey's). */
  wattle: {
    on: 'face',
    draw: (g, f) =>
      line(g, Math.round(f.hx + f.hr), f.hy + 1, Math.round(f.hx + f.hr), f.hy + 3, 'a'),
  },
} as const satisfies Record<string, Mark>;
