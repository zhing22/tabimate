// Primates, cute, facing right, in one of four stances: apes knuckle-walk
// (long front arms, a shoulder hump), monkeys walk on all fours with a tail,
// lemurs carry a big arched tail, gibbons walk upright with their long arms
// raised. A big round head with a pale face patch, the cute face (face.ts)
// and a dark nose. Each species' look (primateLooks.ts) adds what makes it
// special. Slots: fur (base), far limbs (shadow), face and pale marks
// (highlight), the species' colour mark (accent: also the blush where a look
// wants one), the eye's glint (eye).
import { PLACEHOLDER_ART } from '../../../src/config/placeholderArt.ts';
import { blush, cuteEye } from './face.ts';
import { ellipse, line, rect, set, swing, type Grid, type Key, type Pose } from './grid.ts';
import { PRIMATE_LOOKS, type PrimateLook } from './primateLooks.ts';
import { drawTail } from './primateTail.ts';

export interface PrimateSpec {
  readonly plan: 'primate';
  readonly look: keyof typeof PRIMATE_LOOKS;
}

/** Where things are in this frame, for the looks' marks. */
export interface PrimateFrame {
  readonly s: number;
  readonly bx: number;
  readonly by: number;
  readonly rx: number;
  readonly ry: number;
  readonly hx: number;
  readonly hy: number;
  readonly hr: number;
  readonly ground: number;
}

export function drawPrimate(g: Grid, pose: Pose, spec: PrimateSpec): void {
  const look: PrimateLook = PRIMATE_LOOKS[spec.look];
  const f = frameFor(look, pose);
  drawTail(g, look.tail, f.bx - f.rx, f.by - 1, f.s, look.bandedTail === true);
  STANCES[look.stance](g, f, look.limbs ?? 'b');
  look.body?.(g, f);
  look.behindHead?.(g, f);
  ellipse(g, f.hx, f.hy, f.hr, f.hr, 'b');
  ellipse(g, f.hx - 2, f.hy - f.hr + 1, 1, 1, 'b'); // ear
  ellipse(g, f.hx + 1, f.hy + 0.5, f.hr - 1, f.hr - 1.2, 'h'); // face
  look.face?.(g, f);
  cuteEye(g, f.hx, f.hy - 1);
  set(g, f.hx + Math.round(f.hr), f.hy + 1, 'o'); // nose
  if (look.blush) blush(g, f.hx - 1, f.hy + 1);
}

function frameFor(look: PrimateLook, pose: Pose): PrimateFrame {
  const ground = PLACEHOLDER_ART.groundY;
  const [rx, ry] = look.size;
  const hr = look.head;
  const dip = pose.phase % 2;
  const legs = look.stance === 'upright' ? 3 : look.stance === 'knuckle' ? 4 : 3;
  // Apes have no tail to make room for; the rest sit right of centre.
  const bx = look.stance === 'knuckle' ? 9 : 11;
  const by = ground - legs - ry + dip;
  const head: Record<PrimateLook['stance'], [number, number]> = {
    knuckle: [bx + rx + 1, by - ry],
    monkey: [bx + rx + 1, by - ry - 1],
    lemur: [bx + rx + 1, by - ry],
    upright: [bx + 1, by - ry - hr + 1],
  };
  const [hx, hy] = head[look.stance];
  return { s: swing(pose.phase), bx, by, rx, ry, hx, hy, hr, ground };
}

type Stance = (g: Grid, f: PrimateFrame, limbs: Key) => void;

/** A limb two px wide from (x, y) down to the ground; it lifts when stepping forward. */
const limb = (g: Grid, x: number, y: number, ground: number, step: number, k: Key) =>
  rect(g, x + step, y, x + step + 1, ground - (step > 0 ? 1 : 0), k);

const fours: Stance = (g, { s, bx, by, rx, ry, ground }, limbs) => {
  limb(g, bx - rx + 2, by, ground, -s, 's');
  limb(g, bx + rx - 2, by, ground, s, 's');
  ellipse(g, bx, by, rx, ry, 'b');
  limb(g, bx - rx + 1, by + ry - 1, ground, s, limbs);
  limb(g, bx + rx - 3, by + ry - 1, ground, -s, limbs);
};

const STANCES: Readonly<Record<PrimateLook['stance'], Stance>> = {
  monkey: fours,
  lemur: fours,
  // A sloping back, shoulders high and hips low, on long front arms.
  knuckle: (g, f, limbs) => {
    const { s, bx, by, rx, ry, ground } = f;
    limb(g, bx + rx - 2, by - 1, ground, -s, 's'); // far arm
    limb(g, bx - rx + 2, by + 1, ground, s, 's'); // far leg
    ellipse(g, bx - 1, by + 1, rx - 1, ry - 1, 'b'); // hips
    ellipse(g, bx + 2, by - 1, rx - 1, ry + 0.5, 'b'); // chest and shoulders
    limb(g, bx - rx + 1, by + ry - 1, ground, -s, limbs); // near leg, short
    limb(g, bx + rx, by - 1, ground, s, limbs); // near arm, long, in front
  },
  upright: (g, f, limbs) => {
    const { s, bx, by, ry, hy, hr, ground } = f;
    limb(g, bx - 2, by + ry - 1, ground, -s, 's');
    limb(g, bx, by + ry - 1, ground, s, 'b');
    ellipse(g, bx, by, 3, ry, 'b');
    for (const [dx, k] of [
      [-1, 's'],
      [1, limbs],
    ] as const) {
      const [x0, y0, x1, y1] = [bx + dx * 2, by - ry + 1, bx + dx * 6 + s * dx, hy - hr];
      line(g, x0, y0, x1, y1, k); // long arms, raised
      line(g, x0 + 1, y0, x1 + 1, y1, k);
    }
  },
};
