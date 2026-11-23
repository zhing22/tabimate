// Primate tails, a registry by kind, drawn behind the body from its base at
// the rump. A tail is a path of points, sampled into pixels so a banded tail
// (the ring-tailed lemur's) can alternate colours along its length.
import { set, type Grid, type Key } from './grid.ts';

export type TailKind = 'none' | 'short' | 'curl' | 'long' | 'prehensile' | 'arch' | 'bushy';

type Path = (x: number, y: number, s: number) => readonly (readonly [number, number])[];

const PATHS: Readonly<Record<TailKind, Path | null>> = {
  none: null,
  short: (x, y) => [
    [x, y],
    [x - 2, y - 1],
  ],
  // Up and over in a curl, swaying.
  curl: (x, y, s) => [
    [x, y],
    [x - 3, y - 3],
    [x - 3 + s, y - 6],
    [x - 1 + s, y - 7],
  ],
  // Hanging down behind.
  long: (x, y, s) => [
    [x, y],
    [x - 3, y + 2],
    [x - 4 + s, y + 6],
  ],
  // Hanging, its tip curled to grip.
  prehensile: (x, y, s) => [
    [x, y],
    [x - 3, y + 3],
    [x - 3 + s, y + 6],
    [x - 1 + s, y + 6],
  ],
  // The lemurs': a long tail held up in a tall arch over the back.
  arch: (x, y, s) => [
    [x, y],
    [x - 3, y - 3],
    [x - 3 + s, y - 8],
    [x - 1 + s, y - 11],
  ],
  bushy: (x, y, s) => [
    [x, y],
    [x - 3, y - 2],
    [x - 3 + s, y - 6],
  ],
};

/** Thick (2 px) for the arched and bushy tails; banded ones alternate accent and highlight. */
export function drawTail(
  g: Grid,
  kind: TailKind,
  x: number,
  y: number,
  s: number,
  banded: boolean,
) {
  const path = PATHS[kind]?.(x, y, s);
  if (!path) return;
  const thick = kind === 'arch' || kind === 'bushy';
  const pixels = sample(path);
  pixels.forEach(([px, py], i) => {
    const k: Key = banded ? (Math.floor(i / 2) % 2 === 0 ? 'a' : 'h') : 'b';
    set(g, px, py, k);
    if (thick) set(g, px - 1, py, k);
  });
}

/** The path's pixels in order from the base, each once. */
function sample(path: readonly (readonly [number, number])[]): [number, number][] {
  const out: [number, number][] = [];
  const seen = new Set<string>();
  for (let i = 1; i < path.length; i++) {
    const [x0, y0] = path[i - 1]!;
    const [x1, y1] = path[i]!;
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 || 1;
    for (let j = 0; j <= steps; j++) {
      const p: [number, number] = [
        Math.round(x0 + ((x1 - x0) * j) / steps),
        Math.round(y0 + ((y1 - y0) * j) / steps),
      ];
      const key = `${p[0]},${p[1]}`;
      if (!seen.has(key)) out.push(p);
      seen.add(key);
    }
  }
  return out;
}
