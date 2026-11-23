// What every primate look is made of, and the marks several share.
import { ellipse, get, set, type Grid, type Key } from './grid.ts';
import type { PrimateFrame } from './primate.ts';
import type { TailKind } from './primateTail.ts';

export type Marks = (g: Grid, f: PrimateFrame) => void;

export interface PrimateLook {
  readonly stance: 'knuckle' | 'monkey' | 'lemur' | 'upright';
  /** Body radii, and the head's radius. */
  readonly size: readonly [rx: number, ry: number];
  readonly head: number;
  readonly tail: TailKind;
  readonly bandedTail?: boolean;
  /** The near limbs' colour (the squirrel monkey's yellow legs). */
  readonly limbs?: Key;
  readonly blush?: boolean;
  /** Marks on the body, drawn before the head. */
  readonly body?: Marks;
  /** A mane or ruff, drawn just behind the head. */
  readonly behindHead?: Marks;
  /** Marks on the face, drawn before the eye. */
  readonly face?: Marks;
}

export const paint = (g: Grid, x: number, y: number, k: Key) => {
  if (get(g, x, y) !== '.') set(g, x, y, k);
};
export const ruff: Marks = (g, f) => ellipse(g, f.hx - 1, f.hy + 1, f.hr + 0.5, f.hr, 'h'); // round the cheeks
export const mane: Marks = (g, f) => ellipse(g, f.hx - 1, f.hy, f.hr + 1.5, f.hr + 1.5, 'b');
export const shaggy: Marks = (g, f) => {
  for (const dx of [-3, -1, 1]) set(g, f.bx + dx, f.by + f.ry + 1, 'b'); // long hair hanging
};
