// Sharks, swimming side-on, facing right: a pointed, countershaded body, a
// tall dorsal fin, a crescent tail with the upper lobe longer, gill slits and
// a pectoral fin in shadow. Three looks, each its own body and marks; the
// species' colours are in palettes.json (accent: tiger stripes, whale shark
// spots).
import { set, type Grid, type Pose } from './grid.ts';
import { drawMarineBody, fin, paint, type Body, type Shape } from './marine.ts';

export interface SharkSpec {
  readonly plan: 'shark';
  /**
   * classic: great white, tiger, bull, mako, blue, nurse, Greenland (stripes
   * in the accent, which most palettes hide); hammerhead: the wide flat head;
   * filter: whale and basking sharks (blunt head, wide mouth, spots).
   */
  readonly look: 'classic' | 'hammerhead' | 'filter';
}

interface Look {
  readonly shape: Shape;
  /** How tall the first dorsal fin stands above the back. */
  readonly dorsal: number;
  readonly marks: (g: Grid, b: Body) => void;
}

/** How far the tail's upper lobe reaches behind the body. */
const TAIL = 3;
const SHAPE: Shape = { len: 17, high: 6, bulk: 0.8, point: 0.8, belly: 0.4 };

const LOOKS: Readonly<Record<SharkSpec['look'], Look>> = {
  classic: {
    shape: SHAPE,
    dorsal: 4,
    marks: (g, b) => {
      for (let t = 0.3; t <= 0.7; t += 0.12) {
        const x = b.xAt(t);
        for (let y = b.topAt(x); y <= b.topAt(x) + 2; y++) paint(g, x, y, 'a'); // stripes
      }
      mouth(g, b, 0.86);
    },
  },
  hammerhead: {
    shape: { ...SHAPE, len: 16, nose: 2 },
    dorsal: 5,
    marks: (g, b) => {
      // The hammer: a flat blade either side of the head, eyes at its tips.
      for (let y = b.cy - 3; y <= b.cy + 3; y++)
        for (let x = b.x1; x <= b.x1 + 1; x++) set(g, x, y, 'b');
      mouth(g, b, 0.85);
    },
  },
  filter: {
    shape: { len: 17, high: 7, bulk: 0.9, point: 0.5, belly: 0.35 },
    dorsal: 3,
    marks: (g, b) => {
      for (let x = b.xAt(0.2); x <= b.xAt(0.85); x += 2)
        paint(g, x, b.topAt(x) + 1 + ((x >> 1) % 2), 'a'); // spots
      for (let x = b.xAt(0.9); x <= b.x1; x++) paint(g, x, b.cy + 1, 's'); // wide mouth at the front
    },
  },
};

export function drawShark(g: Grid, pose: Pose, spec: SharkSpec): void {
  const look = LOOKS[spec.look];
  const b = drawMarineBody(g, pose, look.shape, TAIL);
  // The crescent tail: the upper lobe long, the lower short.
  fin(g, b.x0, b.tailY, 1, [b.x0 - TAIL, b.tailY - 4], 'b');
  fin(g, b.x0, b.tailY, 1, [b.x0 - 2, b.tailY + 3], 'b');
  const xd = b.xAt(0.55);
  fin(g, xd, b.topAt(xd), 2, [xd - 1, b.topAt(xd) - look.dorsal], 'b');
  const x2 = b.xAt(0.22);
  set(g, x2, b.topAt(x2) - 1, 'b'); // second dorsal
  const xp = b.xAt(0.65);
  fin(g, xp, b.bottomAt(xp), 1, [xp - 2, b.bottomAt(xp) + 3], 's'); // pectoral
  for (const t of [0.76, 0.8]) {
    const x = b.xAt(t);
    for (let y = b.cy - 1; y <= b.cy + 1; y++) paint(g, x, y, 's'); // gill slits
  }
  look.marks(g, b);
  const eye = spec.look === 'hammerhead' ? [b.x1 + 1, b.cy - 3] : [b.xAt(0.9), b.cy - 1];
  set(g, eye[0]!, eye[1]!, 'e');
}

/** An underslung mouth behind the snout. */
function mouth(g: Grid, b: Body, from: number): void {
  for (let x = b.xAt(from); x <= b.xAt(0.94); x++) paint(g, x, b.bottomAt(x) - 1, 's');
}
