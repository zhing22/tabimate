import { BLINK_MS, FOLLOWER_STEP_OFFSET_S, POP_IN_MS, SIZE_PX } from '@/config/render';
import type { TierId } from '@/config/tiers';
import type { Animal } from '@/core/types';
import type { EffectTarget } from './effects/types';
import { createIdleMotion, type IdleMotion, type Pose } from './entities/idleMotion';
import type { Player } from './entities/player';

/** An animal in the party, and everything that animates it. */
export interface Follower {
  readonly animal: Animal;
  readonly tier: TierId;
  readonly shiny: boolean;
  /** Where its tier effect draws: the renderer keeps it on the sprite. */
  readonly target: EffectTarget;
  readonly idle: IdleMotion;
  /** This frame's idle pose. */
  readonly pose: Pose;
  /** 0 when it appears, 1 once fully popped in. */
  pop: number;
  /** Seconds left of a blink (eyes-closed frames); 0 when the eyes are open. */
  blink: number;
}

const STEPS_PER_S = 5;

/** Walking: a 1 px bounce per step, upright. */
export function stepPose(stepTime: number, out: Pose): void {
  out.dy = -Math.round(Math.abs(Math.sin(stepTime * Math.PI * STEPS_PER_S)));
  out.scaleY = 1;
  out.angle = 0;
}

/**
 * How far into the walk follower `index` is: each one a little behind the one
 * in front, so the party doesn't step in lockstep. Used for both the step bob
 * and the walk frames (renderParty), so legs and bob stay in time.
 */
export const followerStepTime = (player: Player, index: number): number =>
  player.stepTime + (index + 1) * FOLLOWER_STEP_OFFSET_S;

export interface NewFollower {
  readonly animal: Animal;
  readonly tier: TierId;
  /** Its place in the party; also varies its idle motion from the others'. */
  readonly index: number;
  /** False when rebuilding a saved run: it is simply there, no pop-in. */
  readonly animate: boolean;
  readonly reducedMotion: boolean;
}

export function createFollower({
  animal,
  tier,
  index,
  animate,
  reducedMotion,
}: NewFollower): Follower {
  const follower: Follower = {
    animal,
    tier,
    shiny: tier === 5,
    target: { x: 0, y: 0, size: SIZE_PX[animal.size], glow: 0 },
    pose: { dy: 0, scaleY: 1, angle: 0 },
    pop: animate ? 0 : 1,
    blink: 0,
    idle: createIdleMotion({
      seed: `${animal.id}|${index}`,
      reducedMotion,
      // Closes this follower's eyes for a moment (called later, from update).
      onBlink: () => {
        follower.blink = BLINK_MS / 1000;
      },
    }),
  };
  return follower;
}

/** One frame for follower `index`: step in time with a walking player, or idle. */
export function updateFollower(f: Follower, index: number, player: Player, dtS: number): void {
  if (player.walking) stepPose(followerStepTime(player, index), f.pose);
  else f.idle.update(dtS, f.pose);
  if (f.blink > 0) f.blink = Math.max(0, f.blink - dtS);
  if (f.pop < 1) f.pop = Math.min(1, f.pop + (dtS * 1000) / POP_IN_MS);
}
