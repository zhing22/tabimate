// Whales, swimming side-on, facing right: a long body with its bulk forward,
// countershaded, flat flukes that beat up and down, a mouth line, a small
// flipper. Each look has its own body, dorsal fin and marks; the species'
// colours are in palettes.json.
import { line, rect, set, type Grid, type Pose } from './grid.ts';
import { drawMarineBody, fin, paint, type Body, type Shape } from './marine.ts';

export interface WhaleSpec {
  readonly plan: 'whale';
  /**
   * rorqual: blue, fin and minke (sleek, throat pleats, small dorsal);
   * humpback: long pale flippers, knobs on the head; right: bowhead, right
   * and gray (no dorsal, arched mouth, pale patches); orca: tall dorsal, white
   * eye patch, grey saddle; sperm: the huge square head, wrinkles; beluga:
   * white, a round melon, no dorsal; narwhal: the tusk, a mottled back.
   */
  readonly look: 'rorqual' | 'humpback' | 'right' | 'orca' | 'sperm' | 'beluga' | 'narwhal';
}

interface Look {
  readonly shape: Shape;
  /** How tall the dorsal fin stands (0: none), and where along the back. */
  readonly dorsal: number;
  readonly dorsalAt?: number;
  readonly marks?: (g: Grid, b: Body) => void;
}

/** How far the flukes reach behind the body. */
const FLUKES = 4;

const dots = (g: Grid, b: Body, from: number, to: number, step: number) => {
  for (let x = b.xAt(from); x <= b.xAt(to); x += step) paint(g, x, b.topAt(x) + 1, 'a');
};

const LOOKS: Readonly<Record<WhaleSpec['look'], Look>> = {
  rorqual: {
    shape: { len: 17, high: 5, bulk: 1.2, point: 0.6, belly: 0.4 },
    dorsal: 1,
    marks: (g, b) => {
      for (let x = b.xAt(0.55); x <= b.xAt(0.92); x += 2) paint(g, x, b.bottomAt(x) - 1, 'a'); // pleats
    },
  },
  humpback: {
    shape: { len: 16, high: 6, bulk: 1.2, point: 0.6, belly: 0.35 },
    dorsal: 1,
    marks: (g, b) => {
      const x = b.xAt(0.7);
      fin(g, x, b.bottomAt(x), 1, [b.xAt(0.42), b.bottomAt(x) + 5], 'h'); // the long white flipper
      dots(g, b, 0.85, 1, 2); // knobs on the head
    },
  },
  right: {
    shape: { len: 16, high: 7, bulk: 1.4, point: 0.5, belly: 0.25 },
    dorsal: 0,
    marks: (g, b) => {
      line(g, b.xAt(0.72), b.cy + 1, b.xAt(0.86), b.cy - 1, 's'); // the arched mouth
      dots(g, b, 0.3, 1, 3); // callosities, mottling
    },
  },
  orca: {
    shape: { len: 16, high: 6, bulk: 1.1, point: 0.7, belly: 0.35 },
    dorsal: 5,
    dorsalAt: 0.5,
    marks: (g, b) => {
      const x = b.xAt(0.78);
      rect(g, x, b.cy - 2, x + 1, b.cy - 1, 'h'); // the eye patch
      const xs = b.xAt(0.38);
      for (let i = 0; i < 3; i++) paint(g, xs + i, b.topAt(xs + i), 'a'); // the grey saddle
    },
  },
  sperm: {
    shape: { len: 17, high: 7, bulk: 1.8, point: 0.3, belly: 0.15 },
    dorsal: 1,
    dorsalAt: 0.3,
    marks: (g, b) => {
      for (let x = b.xAt(0.75); x <= b.x1; x++) paint(g, x, b.bottomAt(x), 'h'); // the narrow jaw
      for (let x = b.xAt(0.15); x <= b.xAt(0.6); x += 3) paint(g, x, b.cy, 'a'); // wrinkles
    },
  },
  beluga: {
    shape: { len: 15, high: 6, bulk: 1.1, point: 0.5, belly: 0.3 },
    dorsal: 0,
    marks: (g, b) => rect(g, b.x1 - 2, b.cy - 4, b.x1, b.cy - 2, 'b'), // the round melon
  },
  narwhal: {
    shape: { len: 13, high: 5, bulk: 1.1, point: 0.6, belly: 0.3, nose: 5 },
    dorsal: 0,
    marks: (g, b) => {
      line(g, b.x1 + 1, b.cy, b.x1 + 5, b.cy - 1, 'h'); // the tusk
      dots(g, b, 0.15, 0.8, 2); // a mottled back
    },
  },
};

export function drawWhale(g: Grid, pose: Pose, spec: WhaleSpec): void {
  const look = LOOKS[spec.look];
  const b = drawMarineBody(g, pose, look.shape, FLUKES);
  // Flukes: flat, seen edge-on, beating up and down with the tail.
  rect(g, b.x0 - 3, b.tailY - 1, b.x0 - 1, b.tailY + 1, 'b');
  set(g, b.x0 - FLUKES, b.tailY, 'b');
  if (look.dorsal > 0) {
    const xd = b.xAt(look.dorsalAt ?? 0.3);
    fin(g, xd, b.topAt(xd), 1, [xd - 1, b.topAt(xd) - look.dorsal], 'b');
  }
  const xp = b.xAt(0.68);
  fin(g, xp, b.bottomAt(xp), 1, [xp - 2, b.bottomAt(xp) + 2], 's'); // flipper
  for (let x = b.xAt(0.8); x <= b.x1 - 1; x++) paint(g, x, b.cy + 1, 's'); // mouth line
  look.marks?.(g, b);
  set(g, b.xAt(0.82), b.cy, 'e');
}
