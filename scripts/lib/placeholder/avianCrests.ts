// A bird's crest, a registry by shape, sitting on the crown.
import type { AvianFrame } from './avian.ts';
import { line, rect, set, type Grid, type Key } from './grid.ts';

export type CrestShape = 'tuft' | 'crown' | 'quills' | 'casque' | 'ears' | 'plume' | 'spiky';
type Crest = (g: Grid, f: AvianFrame, k: Key) => void;

const crown = (f: AvianFrame): [number, number] => [Math.round(f.hx), Math.round(f.hy - f.hr)];

export const CRESTS: Readonly<Record<CrestShape, Crest>> = {
  tuft: (g, f, k) => {
    const [x, y] = crown(f);
    line(g, x - 1, y + 1, x - 3, y - 2, k);
    line(g, x, y + 1, x - 2, y - 2, k);
  },
  crown: (g, f, k) => {
    const [x, y] = crown(f);
    for (const dx of [-2, 0, 2]) {
      line(g, x + dx / 2, y, x + dx, y - 2, 's');
      set(g, x + dx, y - 3, k); // golden tips
    }
  },
  quills: (g, f, k) => {
    const [x, y] = crown(f);
    for (const dy of [1, 3]) line(g, x - 2, y + dy, x - 5, y + dy - 1, k);
  },
  casque: (g, f, k) => {
    const [x, y] = crown(f);
    rect(g, x, y - 2, x + 2, y, k);
  },
  ears: (g, f, k) => {
    const [x, y] = crown(f);
    for (const dx of [-2, 1]) rect(g, x + dx, y - 1, x + dx, y, k);
  },
  plume: (g, f, k) => {
    const [x, y] = crown(f);
    line(g, x - 2, y + 2, x - 6, y + 3, k);
  },
  spiky: (g, f, k) => {
    const [x, y] = crown(f);
    for (const [dx, dy] of [
      [-2, -2],
      [-1, -3],
      [0, -2],
    ] as const)
      line(g, x - 1, y + 1, x + dx, y + dy, k);
  },
};
