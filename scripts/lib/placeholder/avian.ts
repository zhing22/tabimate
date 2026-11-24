// Birds, cute and bright, facing right. A look (avianLooks.ts) picks a pose
// (perched upright, or standing with a neck and legs), sizes, a beak, a tail,
// a crest and marks (avianParts.ts, avianMarks.ts). On the ground the bird
// steps and bobs with its wing folded; in the air (flap) it flies with a
// broad beating wing, legs tucked (a wader's trailing); on water (swim) it
// floats with no legs showing. Slots: body (base), wing (shadow), belly,
// face and pale marks (highlight), the species' bright mark (accent), the
// eye's glint (eye); legs default to outline-dark.
import { PLACEHOLDER_ART } from '../../../src/config/placeholderArt.ts';
import { AVIAN_LOOKS, type AvianLook } from './avianLooks.ts';
import { MARKS } from './avianMarks.ts';
import { CRESTS } from './avianCrests.ts';
import { BEAKS, TAILS } from './avianParts.ts';
import { cuteEye } from './face.ts';
import { ellipse, line, set, swing, type Grid, type Key, type Pose } from './grid.ts';

export interface AvianSpec {
  readonly plan: 'avian';
  readonly look: keyof typeof AVIAN_LOOKS;
}

/** Where things are in this frame, for parts and marks. */
export interface AvianFrame {
  readonly bx: number;
  readonly by: number;
  readonly rx: number;
  readonly ry: number;
  readonly hx: number;
  readonly hy: number;
  readonly hr: number;
  readonly mode: 'ground' | 'fly' | 'float';
  readonly upright: boolean;
  /** The wing's beat (-1 up, 0 level, 1 down) and the legs' swing. */
  readonly beat: number;
  readonly s: number;
}

const BEAT = [-1, 0, 1, 0];
const FLY_Y = 12;

export function drawAvian(g: Grid, pose: Pose, spec: AvianSpec): void {
  const look: AvianLook = AVIAN_LOOKS[spec.look];
  const f = frameFor(look, pose);
  TAILS[look.tail ?? 'short'](g, f, look.tailLen ?? 3, look.tailKey ?? 'b');
  legs(g, f, look);
  ellipse(g, f.bx, f.by, f.rx, f.ry, 'b');
  if (f.mode !== 'fly') ellipse(g, f.bx - 1, f.by - 0.5, f.rx - 1.5, f.ry - 1, 's'); // folded wing
  for (const mark of look.marks ?? []) if (MARKS[mark].on === 'body') MARKS[mark].draw(g, f);
  neck(g, f, look);
  ellipse(g, f.hx, f.hy, f.hr, f.hr, look.headKey ?? 'b');
  if (look.crest) CRESTS[look.crest](g, f, look.crestKey ?? 'a');
  for (const mark of look.marks ?? []) if (MARKS[mark].on === 'face') MARKS[mark].draw(g, f);
  BEAKS[look.beak](g, Math.round(f.hx + f.hr), Math.round(f.hy), look.beakKey ?? 'a');
  cuteEye(g, Math.round(f.hx), Math.round(f.hy) - 2);
  if (f.mode === 'fly') wing(g, f, look.wing ?? 6);
}

function frameFor(look: AvianLook, pose: Pose): AvianFrame {
  const [rx, ry] = look.size;
  const hr = look.head;
  const neckLen = look.neck ?? 0;
  const bob = pose.phase % 2;
  const mode = pose.mode === 'flap' ? 'fly' : pose.mode === 'swim' ? 'float' : 'ground';
  const upright = look.pose === 'perch' && mode !== 'fly';
  const ground = PLACEHOLDER_ART.groundY;
  // In flight a long neck reaches forward: the body moves back to make room.
  const bx = (upright ? 11 : 10) - (mode === 'fly' ? Math.round(neckLen * 0.5) : 0);
  const by =
    mode === 'fly'
      ? FLY_Y + bob
      : mode === 'float'
        ? ground - ry - 1 + bob
        : ground - look.legs - ry + bob;
  const [hx, hy] =
    mode === 'fly'
      ? [bx + rx + 1 + Math.round(neckLen * 0.5), by - 1 - Math.round(neckLen * 0.3)]
      : upright
        ? [bx + 1.5, by - ry - hr + 2 - neckLen]
        : [bx + rx + 0.5, by - ry - neckLen - hr + 2];
  const phase = pose.phase % BEAT.length;
  return { bx, by, rx, ry, hx, hy, hr, mode, upright, beat: BEAT[phase]!, s: swing(phase) };
}

/** Two legs to the ground, stepping; trailing behind a long-legged flyer; none afloat. */
function legs(g: Grid, f: AvianFrame, look: AvianLook): void {
  const k: Key = look.legKey ?? 'o';
  if (f.mode === 'float') return;
  if (f.mode === 'fly') {
    if (look.legs >= 5)
      line(g, f.bx - f.rx + 1, f.by + 1, Math.max(1, f.bx - f.rx - 3), f.by + 2, k);
    return;
  }
  const ground = PLACEHOLDER_ART.groundY;
  for (const [x, dx] of [
    [f.bx - 1, -f.s],
    [f.bx + 1, f.s],
  ] as const) {
    line(g, x, f.by + f.ry - 1, x + dx, ground - (dx > 0 ? 1 : 0), k);
    set(g, x + dx + 1, ground - (dx > 0 ? 1 : 0), k); // a foot
  }
}

/** A neck two pixels thick from the shoulders up (or forward, in flight) to the head. */
function neck(g: Grid, f: AvianFrame, look: AvianLook): void {
  if (!look.neck) return;
  const [nx, ny] = f.upright ? [f.bx + 1, f.by - f.ry] : [f.bx + f.rx - 1, f.by - f.ry + 1];
  const k = look.neckKey ?? 'b';
  line(g, nx, ny, f.hx, f.hy, k);
  line(g, nx - 1, ny, f.hx - 1, f.hy, k);
}

/** The near wing in flight: a broad fan from the shoulder to a two-pixel tip, beating. */
function wing(g: Grid, f: AvianFrame, reach: number): void {
  const sy = f.by - f.ry + 1;
  const tipY = f.beat === 0 ? sy - 2 : sy + f.beat * 5;
  for (let x = f.bx - 2; x <= f.bx + 2; x++)
    for (const dy of [0, 1]) line(g, x, sy + dy, Math.max(1, f.bx - reach - 1), tipY + dy, 's');
}
