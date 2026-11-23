// Sharks, cute and chunky, swimming side-on, facing right: a big round head
// tapering to a forked tail that sways, a large swept-back dorsal fin, a
// smile over a pale lower jaw (only a thin pale strip runs back along the
// belly), gill stripes, a pink blush and a dark 2 x 2 eye with a glint.
// Slots: back (base), gills, stripes and fin lines (shadow), jaw, belly strip
// and spots (highlight), blush (accent), the eye's glint (eye); the eye and
// mouth are outline-dark. The species' colours are in palettes.json.
import { rect, set, type Grid, type Pose } from './grid.ts';
import { blush, cuteEye } from './face.ts';
import { drawMarineBody, fin, paint, type Body, type Shape } from './marine.ts';

export interface SharkSpec {
  readonly plan: 'shark';
  /**
   * classic: great white, bull, mako, blue, nurse, Greenland; striped: the
   * tiger shark; hammerhead: the hammer, eyes at its tips; filter: whale and
   * basking sharks (bigger, a wide mouth at the front, spots).
   */
  readonly look: 'classic' | 'striped' | 'hammerhead' | 'filter';
}

interface Look {
  readonly shape: Shape;
  /** A wide mouth straight across the front (filter feeders), not a smile. */
  readonly wideMouth?: boolean;
  readonly hammer?: boolean;
  readonly marks?: (g: Grid, b: Body) => void;
}

/** How far the tail's upper lobe reaches behind the body. */
const TAIL = 4;
const BODY: Shape = { len: 17, high: 7, bulk: 1.4, point: 0.55, belly: 0, sway: 1 };
/** Where the eye sits along the body; the gill stripes are spaced behind it. */
const EYE_AT = 0.8;
const GILLS = [-7, -5, -3];

const LOOKS: Readonly<Record<SharkSpec['look'], Look>> = {
  classic: { shape: BODY },
  striped: {
    shape: BODY,
    marks: (g, b) => {
      for (let x = b.xAt(0.15); x <= b.xAt(0.45); x += 2)
        for (let y = b.topAt(x) + 1; y <= b.topAt(x) + 2; y++) paint(g, x, y, 's');
    },
  },
  hammerhead: { shape: { ...BODY, nose: 1 }, hammer: true },
  filter: {
    shape: { ...BODY, len: 18, high: 8, bulk: 1.3, point: 0.5 },
    wideMouth: true,
    marks: (g, b) => {
      for (let x = b.xAt(0.1); x <= b.xAt(0.7); x += 2)
        paint(g, x, b.topAt(x) + 1 + ((x >> 1) % 2) * 2, 'h'); // spots
    },
  },
};

export function drawShark(g: Grid, pose: Pose, spec: SharkSpec): void {
  const look = LOOKS[spec.look];
  const b = drawMarineBody(g, pose, look.shape, TAIL);
  fins(g, b);
  jaw(g, b, look.wideMouth === true);
  const ex = b.xAt(EYE_AT);
  for (const dx of GILLS) for (let y = b.cy - 1; y <= b.cy + 1; y++) paint(g, ex + dx, y, 's');
  look.marks?.(g, b);
  if (look.hammer) hammer(g, b);
  else {
    cuteEye(g, ex, b.cy - 2);
    blush(g, ex - 1, b.cy);
  }
}

function fins(g: Grid, b: Body): void {
  // The forked tail (it sways with the tail end of the body).
  fin(g, b.x0, b.tailY - 1, 2, [b.x0 - TAIL, b.tailY - 4], 'b');
  fin(g, b.x0, b.tailY + 1, 2, [b.x0 - TAIL + 1, b.tailY + 3], 'b');
  const xd = b.xAt(0.55); // the big dorsal, swept back (well clear of the tail)
  fin(g, xd, b.topAt(xd), 3, [b.xAt(0.4), b.topAt(xd) - 5], 'b');
  const xp = b.xAt(0.55); // pectoral fin, then a little pelvic fin
  fin(g, xp, b.bottomAt(xp), 2, [xp - 3, b.bottomAt(xp) + 3], 'b');
  const xv = b.xAt(0.22);
  set(g, xv, b.bottomAt(xv) + 1, 'b');
}

/** A pale lower jaw under the mouth, and a thin pale strip back along the belly. */
function jaw(g: Grid, b: Body, wide: boolean): void {
  const mouthY = b.cy + 1;
  const from = b.xAt(wide ? 0.8 : 0.6);
  for (let x = from; x <= b.x1; x++) {
    for (let y = mouthY + 1; y <= b.bottomAt(x); y++) paint(g, x, y, 'h');
    if (x < b.x1) paint(g, x, mouthY, 'o');
  }
  if (!wide) paint(g, from, mouthY - 1, 'o'); // the corner of the smile turns up
  for (let x = b.xAt(0.25); x < from; x++) paint(g, x, b.bottomAt(x), 'h');
}

/** The hammer: a blade across the front of the head, an eye at its top tip. */
function hammer(g: Grid, b: Body): void {
  rect(g, b.x1, b.cy - 4, b.x1 + 1, b.cy + 2, 'b');
  set(g, b.x1 + 1, b.cy - 4, 'o');
  set(g, b.x1 + 1, b.cy - 3, 'e');
  blush(g, b.xAt(0.82), b.cy);
}
