import { WATER } from '@/config/movement';
import { BLINK_MS, FOLLOWER_STEP_OFFSET_S, POP_IN_MS, SIZE_PX } from '@/config/render';
import { isShiny, type LevelId } from '@/config/levels';
import type { Animal } from '@/core/types';
import type { EffectTarget } from './effects/types';
import { createIdleMotion, type IdleMotion, type Pose } from './entities/idleMotion';
import type { Player } from './entities/player';

/** An animal in the party, and everything that animates it. */
export interface Follower {
  readonly animal: Animal;
  readonly level: LevelId;
  readonly shiny: boolean;
  /** Where its level effect draws: the renderer keeps it on the sprite. */
  readonly target: EffectTarget;
  readonly idle: IdleMotion;
  /** This frame's idle pose. */
  readonly pose: Pose;
  /** 0 when it appears, 1 once fully popped in. */
  pop: number;
  /** Seconds left of a blink (eyes-closed frames); 0 when the eyes are open. */
  blink: number;
  /** Its own clock for hovering and bobbing (scene/entities/movement.ts), seconds. */
  motionS: number;
  /** 0..2π: where in its bob it starts, so the party doesn't bob in step. */
  readonly phase: number;
  /** A water animal's bubble on land: 1 whole, easing to 0 as it pops in water. Else 0. */
  bubble: number;
}

/** What the world around the party is like this frame. */
export interface FollowerEnv {
  /** The party is in a biome with water to swim in (WATER.swimBiomes). */
  readonly inWater: boolean;
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
  readonly level: LevelId;
  /** Its place in the party; also varies its idle motion from the others'. */
  readonly index: number;
  /** False when rebuilding a saved run: it is simply there, no pop-in. */
  readonly animate: boolean;
  readonly reducedMotion: boolean;
}

export function createFollower({
  animal,
  level,
  index,
  animate,
  reducedMotion,
}: NewFollower): Follower {
  const follower: Follower = {
    animal,
    level,
    shiny: isShiny(level),
    target: { x: 0, y: 0, size: SIZE_PX[animal.size], glow: 0 },
    pose: { dy: 0, scaleY: 1, angle: 0 },
    pop: animate ? 0 : 1,
    blink: 0,
    motionS: 0,
    phase: (index * 2.4) % (2 * Math.PI),
    bubble: animal.movement === 'water' ? 1 : 0,
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

/**
 * One frame for follower `index`: step in time with a walking player, or
 * idle. Off the ground (sky, water) there are no steps: only its own bob.
 */
export function updateFollower(
  f: Follower,
  index: number,
  player: Player,
  dtS: number,
  env: FollowerEnv,
): void {
  const walks = f.animal.movement === 'land';
  if (player.walking && walks) stepPose(followerStepTime(player, index), f.pose);
  else f.idle.update(dtS, f.pose);
  if (f.blink > 0) f.blink = Math.max(0, f.blink - dtS);
  if (f.pop < 1) f.pop = Math.min(1, f.pop + (dtS * 1000) / POP_IN_MS);
  f.motionS += dtS;
  if (f.animal.movement === 'water') {
    // Pops (eases to 0) in water, and forms again on land.
    const step = (dtS * 1000) / WATER.popMs;
    f.bubble = env.inWater ? Math.max(0, f.bubble - step) : Math.min(1, f.bubble + step);
  }
}
