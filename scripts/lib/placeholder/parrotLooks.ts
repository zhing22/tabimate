// Each parrot look: its size, tail, and the marks that make the species
// special. Species sharing a look differ by palette (palettes.json): the
// scarlet macaw's white face is the hyacinth's yellow eye ring.
import { ellipse, line, paintOver, rect, set, type Grid, type Key } from './grid.ts';
import type { ParrotFrame } from './parrot.ts';

type Marks = (g: Grid, f: ParrotFrame) => void;

export interface ParrotLook {
  /** Body radii, and the head's radius. */
  readonly size: readonly [rx: number, ry: number];
  readonly headSize: number;
  /** Tail length, and its colour (default the body's). */
  readonly tail: number;
  readonly tailKey?: Key;
  /** The head's colour (default the body's), the beak's (default dark). */
  readonly head?: Key;
  readonly beak?: Key;
  /** The wing's colour, and its underside's (seen as it beats up). */
  readonly wing?: Key;
  readonly underwing?: Key;
  readonly body?: Marks;
  readonly face?: Marks;
}

/** A crest swept up and back from the crown. */
const crest =
  (k: Key): Marks =>
  (g, f) => {
    const [x, y] = [Math.round(f.hx) - 1, Math.round(f.hy - f.hr) + 1];
    line(g, x, y, x - 3, y - 3, k);
    line(g, x + 1, y, x - 2, y - 3, k);
    set(g, x - 1, y - 4, k);
  };

/** A band of the accent across the folded wing. */
const wingBand: Marks = (g, f) => {
  if (f.flying) return;
  for (let x = f.bx - f.rx; x <= f.bx + 1; x++) paintOver(g, x, Math.round(f.by) - 1, 's', 'a');
};

export const PARROT_LOOKS = {
  macaw: {
    size: [3.5, 4.5],
    headSize: 3.5,
    tail: 8,
    body: wingBand,
    face: (g, f) => ellipse(g, f.hx + 1, f.hy, 2, 1.5, 'h'), // bare face patch (eye ring)
  },
  budgie: {
    size: [3, 3.5],
    headSize: 3,
    tail: 5,
    head: 'h', // yellow face
    body: (g, f) => {
      for (let y = Math.round(f.by - f.ry) + 2; y < f.by + f.ry - 1; y += 2)
        for (let x = f.bx - 2; x <= f.bx; x++) paintOver(g, x, y, 's', 'o'); // barring on the wing
    },
    face: (g, f) => set(g, Math.round(f.hx), Math.round(f.hy) + 2, 'a'), // cheek spot
  },
  cockatiel: {
    size: [3.5, 4],
    headSize: 3,
    tail: 7,
    head: 'h', // yellow face
    face: (g, f) => {
      crest('h')(g, f);
      rect(
        g,
        Math.round(f.hx) - 1,
        Math.round(f.hy) + 1,
        Math.round(f.hx),
        Math.round(f.hy) + 2,
        'a',
      ); // orange cheek
    },
  },
  cockatoo: {
    size: [4, 4.5],
    headSize: 3.5,
    tail: 4,
    face: crest('a'),
  },
  kea: {
    size: [4, 4],
    headSize: 3.5,
    tail: 5,
    underwing: 'a', // orange under the wings, flashing as it flaps
    face: (g, f) => set(g, Math.round(f.hx + f.hr) + 2, Math.round(f.hy) + 2, 'o'), // long curved bill
  },
  lorikeet: {
    size: [3.5, 4],
    headSize: 3,
    tail: 6,
    head: 'a', // blue head
    beak: 'h',
    body: (g, f) => ellipse(g, f.bx + 1.5, f.by - f.ry + 2, 2, 2, 'h'), // orange chest
  },
  'grey-parrot': {
    size: [3.5, 4.5],
    headSize: 3.5,
    tail: 4,
    tailKey: 'a', // the red tail
    face: (g, f) => ellipse(g, f.hx + 1, f.hy - 1, 2, 1.5, 'h'), // pale face patch
  },
  kakapo: {
    size: [5, 4],
    headSize: 3.5,
    tail: 3,
    face: (g, f) => ellipse(g, f.hx + 1, f.hy + 0.5, 2.5, 2.5, 'h'), // owl-like face disc
    body: (g, f) => {
      for (const [dx, dy] of [
        [-3, -2],
        [-1, 0],
        [-3, 1],
        [0, -2],
      ] as const)
        paintOver(g, f.bx + dx, Math.round(f.by) + dy, 's', 'o'); // mottled moss
    },
  },
} as const satisfies Record<string, ParrotLook>;
