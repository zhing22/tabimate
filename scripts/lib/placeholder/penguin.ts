// Penguins, standing upright on the ground and waddling, facing right. Drawn
// in their own colours rather than auto-shaded: a dark back and head (base),
// a white front (highlight), dark beak, feet and chest band (shadow), and the
// species' marks in the accent: a great penguin's yellow ear patch and throat,
// a crested penguin's yellow brow plumes, a brush-tail's eye ring, a banded
// penguin's pink eye patch. Palettes make the species (palettes.json).
import { PLACEHOLDER_ART } from '../../../src/config/placeholderArt.ts';
import { ellipse, get, line, rect, set, swing, type Grid, type Pose } from './grid.ts';

export interface PenguinSpec {
  readonly plan: 'penguin';
  /**
   * great: emperor and king (tall, ear patches, long beak); crested: macaroni
   * and rockhopper (brow plumes); brush: Adélie, gentoo, chinstrap and the
   * like (a mark round the eye); banded: African, Humboldt, Galápagos (a white
   * face stripe and a dark band across the chest).
   */
  readonly look: 'great' | 'crested' | 'brush' | 'banded';
}

interface Body {
  readonly cx: number;
  readonly top: number;
  readonly hx: number;
  readonly hy: number;
}

export function drawPenguin(g: Grid, pose: Pose, spec: PenguinSpec): void {
  const great = spec.look === 'great';
  const ground = PLACEHOLDER_ART.groundY;
  const s = swing(pose.phase);
  // A waddle: the body dips on each step and leans the way it steps.
  const dip = pose.phase % 2;
  const cx = 11 + (s > 0 ? 1 : 0);
  const top = (great ? 4 : 6) + dip;
  const body: Body = { cx, top, hx: cx + 1, hy: top + 3 };

  feet(g, ground, cx, s);
  ellipse(g, cx, (top + ground) / 2, great ? 4.5 : 4, (ground - top) / 2 - 0.5, 'b');
  ellipse(g, body.hx, body.hy, 3, 3, 'b');
  front(g, body, ground);
  // The flipper, darker than the back and swinging past it so it reads.
  line(g, cx - 3, top + 8, cx - 5 - s, top + 13, 's');
  line(g, cx - 2, top + 8, cx - 4 - s, top + 13, 's');
  beak(g, body, great);
  MARKS[spec.look](g, body);
  set(g, body.hx + 1, body.hy - 1, 'e');
}

/** Two dark feet on the ground; the stepping one lifts. */
function feet(g: Grid, ground: number, cx: number, s: number): void {
  rect(g, cx - 3, ground - (s < 0 ? 1 : 0), cx - 1, ground - (s < 0 ? 1 : 0), 's');
  rect(g, cx + 1, ground - (s > 0 ? 1 : 0), cx + 3, ground - (s > 0 ? 1 : 0), 's');
}

/** The white front, from the throat down, only over the body. */
function front(g: Grid, body: Body, ground: number): void {
  const fx = body.cx + 2;
  for (let y = body.hy + 2; y < ground; y++)
    for (let x = fx - 2; x <= fx + 3; x++) {
      const dx = (x - fx) / 3.5;
      const dy = (y - (body.hy + ground) / 2) / ((ground - body.hy) / 2);
      if (dx * dx + dy * dy <= 1 && get(g, x, y) === 'b') set(g, x, y, 'h');
    }
}

function beak(g: Grid, { hx, hy }: Body, long: boolean): void {
  if (long) {
    line(g, hx + 3, hy, hx + 6, hy + 1, 's');
    set(g, hx + 4, hy + 1, 'a'); // the orange stripe on the lower bill
  } else rect(g, hx + 3, hy, hx + 4, hy, 's');
}

/** Each look's marks, a registry by look. */
const MARKS: Readonly<Record<PenguinSpec['look'], (g: Grid, body: Body) => void>> = {
  great: (g, { hx, hy }) => {
    ellipse(g, hx - 1, hy + 1, 1, 1.5, 'a'); // ear patch
    rect(g, hx + 1, hy + 3, hx + 2, hy + 4, 'a'); // golden throat
  },
  crested: (g, { hx, hy }) => {
    line(g, hx, hy - 2, hx - 3, hy - 3, 'a'); // brow plumes, swept back
    line(g, hx - 3, hy - 3, hx - 4, hy - 1, 'a');
  },
  brush: (g, { hx, hy }) => {
    for (const [dx, dy] of [
      [0, -1],
      [2, -1],
      [1, -2],
      [1, 0],
    ] as const)
      set(g, hx + dx, hy + dy, 'a'); // a ring round the eye
    line(g, hx - 1, hy - 2, hx - 2, hy - 1, 'a'); // and a stripe back over the head
  },
  banded: (g, { cx, hx, hy }) => {
    line(g, hx + 1, hy - 3, hx - 2, hy - 1, 'h'); // white stripe over the eye...
    line(g, hx - 2, hy - 1, hx - 1, hy + 3, 'h'); // ...down behind the face
    rect(g, cx + 1, hy + 5, cx + 4, hy + 5, 's'); // dark band across the chest
    set(g, hx + 2, hy - 1, 'a'); // pink patch by the eye
  },
};
