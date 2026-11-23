// Rabbits and hares, cute, hopping, facing right: a round body, a big head,
// tall ears with pink insides that tilt back in the air, a pink nose, a pale
// belly and muzzle, the cute face (face.ts). Each species has what sets it
// apart: the rabbit's white cottontail, the pygmy rabbit's tiny size and
// short ears, a hare's long legs and long black-tipped ears, the snowshoe
// hare's big pale feet.
// Slots: fur (base), far ear and far legs (shadow), belly, muzzle, tail and
// big feet (highlight), ear insides, nose and blush (accent), the eye's glint
// (eye); ear tips are outline-dark.
import { PLACEHOLDER_ART } from '../../../src/config/placeholderArt.ts';
import { blush, cuteEye } from './face.ts';
import { ellipse, rect, set, type Grid, type Key, type Pose } from './grid.ts';

export interface RabbitSpec {
  readonly plan: 'rabbit';
  readonly look: 'rabbit' | 'pygmy' | 'hare' | 'snowshoe';
}

interface Look {
  /** Ear length above the head, px. */
  readonly ears: number;
  /** Body radii, and how far the body sits off the ground (leg length). */
  readonly body: readonly [rx: number, ry: number];
  readonly legs: number;
  readonly blackTips?: boolean;
  readonly tail: Key;
  /** The hind foot's length, and its colour. */
  readonly foot: readonly [length: number, k: Key];
}

const LOOKS: Readonly<Record<RabbitSpec['look'], Look>> = {
  rabbit: { ears: 5, body: [5, 4], legs: 1, tail: 'h', foot: [4, 'b'] },
  pygmy: { ears: 4, body: [4, 3], legs: 1, tail: 'b', foot: [3, 'b'] },
  hare: { ears: 7, body: [5, 3.5], legs: 3, blackTips: true, tail: 'h', foot: [4, 'b'] },
  snowshoe: { ears: 6, body: [5, 3.5], legs: 2, blackTips: true, tail: 'h', foot: [6, 'h'] },
};

/** How high the hop lifts the rabbit, frame by frame. */
const HOP = [0, 2, 3, 1];

export function drawRabbit(g: Grid, pose: Pose, spec: RabbitSpec): void {
  const look = LOOKS[spec.look];
  const ground = PLACEHOLDER_ART.groundY;
  const lift = HOP[pose.phase % HOP.length]!;
  const [rx, ry] = look.body;
  const by = ground - look.legs - ry - lift; // body centre
  const bx = 10;
  const [hx, hy] = [bx + rx, by - ry]; // head centre
  const airborne = lift > 1;

  ellipse(g, bx - rx, by - 1, 1.5, 1.5, look.tail); // tail
  ears(g, hx, hy - 2, look, airborne ? 1 : 0);
  const [footLen, footKey] = look.foot;
  // Hind foot: flat on the ground, stretched back in the air; front paws.
  const footY = by + ry + look.legs;
  rect(
    g,
    bx - rx + 1 - (airborne ? 1 : 0),
    footY,
    bx - rx + footLen - (airborne ? 1 : 0),
    footY,
    footKey,
  );
  rect(g, bx + 1, by + ry, bx + 1, footY - 1, 's'); // far front leg
  rect(g, bx - 2, by, bx - 1, footY - 1, 'b'); // hind leg
  ellipse(g, bx, by, rx, ry, 'b');
  ellipse(g, bx + 1, by + 1, rx - 2, ry - 1.5, 'h'); // belly
  rect(g, bx + 3, by + ry, bx + 3, footY, 'b'); // near front paw
  ellipse(g, hx, hy, 3.5, 3, 'b');
  rect(g, hx + 2, hy + 1, hx + 3, hy + 2, 'h'); // muzzle
  set(g, hx + 4, hy + 1, 'a'); // nose
  cuteEye(g, hx, hy - 1);
  blush(g, hx - 1, hy + 1);
}

/** Two ears up from the head, the far one darker; they tilt back as it leaps. */
function ears(g: Grid, x: number, y: number, look: Look, tilt: number): void {
  for (const [ex, k] of [
    [x - 2, 's'],
    [x, 'b'],
  ] as const) {
    for (let i = 0; i < look.ears; i++) {
      const lean = Math.round((i * tilt) / 2);
      set(g, ex - lean, y - i, k);
      set(g, ex + 1 - lean, y - i, k === 'b' && i > 0 && i < look.ears - 1 ? 'a' : k);
    }
    if (look.blackTips) {
      const top = look.ears - 1;
      const lean = Math.round((top * tilt) / 2);
      rect(g, ex - lean, y - top, ex + 1 - lean, y - top, 'o');
    }
  }
}
