import { seededRandom } from '../random';

/** How a standing character is drawn this frame, relative to its rest pose. */
export interface Pose {
  /** Vertical offset in whole native px (negative is up). */
  dy: number;
  /** 1 at rest; dips to SQUASH_MIN on each breath. */
  scaleY: number;
  /** Radians. */
  angle: number;
}

export interface IdleMotion {
  /** Advances the motion and writes this frame's pose into `out`. */
  update(dtS: number, out: Pose): Pose;
}

export interface IdleMotionOptions {
  /** Makes each character move out of step with the others. */
  readonly seed: string;
  /** prefers-reduced-motion: keep only the gentle bob. */
  readonly reducedMotion: boolean;
  /** Called now and then; Step 8b swaps in a blink frame. */
  readonly onBlink?: () => void;
}

const BOB_PERIOD_S = 1.6;
const BREATH_PERIOD_S = 2.4;
const WOBBLE_PERIOD_S = 3.1;
export const SQUASH_MIN = 0.92;
const WOBBLE_RAD = (2 * Math.PI) / 180; // 2 degrees
const BLINK_MIN_S = 2;
const BLINK_MAX_S = 5;
const TAU = 2 * Math.PI;

/**
 * Standing-still motion done in code, so sprites need no idle frames: a bob,
 * squash and stretch, a slight tilt wobble, and a blink hook.
 */
export function createIdleMotion(options: IdleMotionOptions): IdleMotion {
  const random = seededRandom(options.seed);
  const phase = random() * TAU;
  const nextBlink = () => BLINK_MIN_S + random() * (BLINK_MAX_S - BLINK_MIN_S);
  let t = 0;
  let blinkIn = nextBlink();

  return {
    update(dtS, out) {
      t += dtS;
      blinkIn -= dtS;
      if (blinkIn <= 0) {
        blinkIn = nextBlink();
        options.onBlink?.();
      }
      // A 1 px bob: whole pixels only, so the sprite never smears between rows.
      out.dy = Math.round(Math.sin((t / BOB_PERIOD_S) * TAU + phase) * 0.6);
      if (options.reducedMotion) {
        out.scaleY = 1;
        out.angle = 0;
        return out;
      }
      // 1 -> SQUASH_MIN -> 1 once per breath.
      const breath = (1 - Math.cos((t / BREATH_PERIOD_S) * TAU + phase)) / 2;
      out.scaleY = 1 - (1 - SQUASH_MIN) * breath;
      out.angle = Math.sin((t / WOBBLE_PERIOD_S) * TAU + phase * 1.7) * WOBBLE_RAD;
      return out;
    },
  };
}
