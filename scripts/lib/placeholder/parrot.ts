// Parrots, cute and bright, facing right: perched upright on the ground (a
// folded wing on the side, a little bob), or in the air with the wing
// beating and the tail streaming back. A big round head, a chunky hooked
// beak, the cute eye (face.ts). Each species' look (parrotLooks.ts) adds what
// makes it special. Slots: body (base), wing and legs (shadow), face, chest
// or crest (highlight), the species' bright mark (accent), the eye's glint.
import { PLACEHOLDER_ART } from '../../../src/config/placeholderArt.ts';
import { cuteEye } from './face.ts';
import { ellipse, line, rect, set, type Grid, type Key, type Pose } from './grid.ts';
import { PARROT_LOOKS, type ParrotLook } from './parrotLooks.ts';

export interface ParrotSpec {
  readonly plan: 'parrot';
  readonly look: keyof typeof PARROT_LOOKS;
}

/** Where things are in this frame, for the looks' marks. */
export interface ParrotFrame {
  readonly bx: number;
  readonly by: number;
  readonly rx: number;
  readonly ry: number;
  readonly hx: number;
  readonly hy: number;
  readonly hr: number;
  readonly flying: boolean;
  /** Where the wing tip is in its beat: -1 up, 0 level, 1 down. */
  readonly beat: number;
}

const BEAT = [-1, 0, 1, 0];

export function drawParrot(g: Grid, pose: Pose, spec: ParrotSpec): void {
  const look: ParrotLook = PARROT_LOOKS[spec.look];
  const f = frameFor(look, pose);
  tail(g, f, look);
  legs(g, f);
  ellipse(g, f.bx, f.by, f.rx, f.ry, 'b');
  if (!f.flying) ellipse(g, f.bx - 1, f.by, f.rx - 1, f.ry - 1, look.wing ?? 's'); // folded wing
  look.body?.(g, f);
  ellipse(g, f.hx, f.hy, f.hr, f.hr, look.head ?? 'b');
  look.face?.(g, f);
  beak(g, f, look.beak ?? 'o');
  cuteEye(g, Math.round(f.hx), Math.round(f.hy) - 2);
  if (f.flying) wing(g, f, f.beat < 0 ? (look.underwing ?? 's') : (look.wing ?? 's'));
}

function frameFor(look: ParrotLook, pose: Pose): ParrotFrame {
  const flying = pose.mode === 'flap';
  const [rx, ry] = look.size;
  const bob = pose.phase % 2;
  const by = flying ? 13 + bob : PLACEHOLDER_ART.groundY - 2 - ry + bob;
  const bx = 11;
  const hr = look.headSize;
  return {
    bx,
    by,
    rx,
    ry,
    hx: bx + 1.5,
    hy: by - ry - hr + 2,
    hr,
    flying,
    beat: BEAT[pose.phase % BEAT.length]!,
  };
}

/** Two legs and dark feet on the ground; tucked up in the air. */
function legs(g: Grid, f: ParrotFrame): void {
  const ground = PLACEHOLDER_ART.groundY;
  if (f.flying) {
    set(g, f.bx, f.by + f.ry + 1, 's');
    return;
  }
  for (const x of [f.bx - 1, f.bx + 1]) {
    rect(g, x, f.by + f.ry, x, ground - 1, 's');
    set(g, x + 1, ground, 'o');
    set(g, x, ground, 'o');
  }
}

/** Two px wide: angled down behind when perched, straight back in flight. */
function tail(g: Grid, f: ParrotFrame, look: ParrotLook): void {
  const [x0, y0] = [f.bx - f.rx + 1, f.by + f.ry - 1];
  const [x1, y1] = f.flying
    ? [x0 - look.tail, y0 + 1]
    : [
        x0 - Math.round(look.tail * 0.6),
        Math.min(PLACEHOLDER_ART.groundY, y0 + Math.round(look.tail * 0.8)),
      ];
  line(g, x0, y0, x1, y1, look.tailKey ?? 'b');
  line(g, x0 + 1, y0, x1 + 1, y1, look.tailKey ?? 'b');
}

/** A chunky hooked beak at the front of the head. */
function beak(g: Grid, f: ParrotFrame, k: Key): void {
  const x = Math.round(f.hx + f.hr);
  const y = Math.round(f.hy);
  rect(g, x, y - 1, x + 1, y, k);
  set(g, x + 1, y + 1, k); // the hook
  set(g, x, y + 1, k);
}

/** The near wing: a fan from the shoulder out to the tip, beating. */
function wing(g: Grid, f: ParrotFrame, k: Key): void {
  const sy = f.by - f.ry + 2;
  const tipY = f.beat === 0 ? sy - 2 : sy + f.beat * 5;
  // A broad wing: fanned from a wide shoulder out to a two-pixel tip.
  for (let x = f.bx - 2; x <= f.bx + 2; x++)
    for (const dy of [0, 1]) line(g, x, sy + dy, f.bx - 7, tipY + dy, k);
}
