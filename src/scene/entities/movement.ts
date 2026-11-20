// How each kind of follower gets about, by animal.movement: a registry, so a
// new kind is a new entry. Land animals walk on the trail; sky animals hover
// over it with a shadow below; water animals ride a bubble on land and swim
// where there is water. Pure: a placement in, nothing allocated.
import type { Movement } from '@/config/animals';
import { SKY, WATER } from '@/config/movement';
import type { Point } from './followerTrail';

/** What a strategy reads about one follower this frame. */
export interface MovementInput {
  /** Seconds this follower has been moving about (its own clock). */
  readonly timeS: number;
  /** 0..2π, so the party's bobs aren't in step. */
  readonly phase: number;
  /** The party is in a biome with water to swim in. */
  readonly inWater: boolean;
  /** No bobbing: hover and swim still, but hold steady. */
  readonly reducedMotion: boolean;
}

/** Where and how to draw a follower; written into, so a frame allocates nothing. */
export interface Placement {
  x: number;
  y: number;
  /** Draw a shadow on the walk line under it (it is off the ground). */
  shadow: boolean;
  /** Which frames to play: its walk, its wing flaps, or its swim. */
  anim: 'walk' | 'flap' | 'swim';
}

export type MovementFn = (onPath: Point, input: MovementInput, out: Placement) => Placement;

const bob = (input: MovementInput, px: number, hz: number) =>
  input.reducedMotion ? 0 : Math.sin(input.timeS * 2 * Math.PI * hz + input.phase) * px;

const land: MovementFn = (onPath, _input, out) => {
  out.x = onPath.x;
  out.y = onPath.y;
  out.shadow = false;
  out.anim = 'walk';
  return out;
};

const sky: MovementFn = (onPath, input, out) => {
  out.x = onPath.x;
  out.y = Math.round(onPath.y - SKY.hoverPx + bob(input, SKY.bobPx, SKY.bobHz));
  out.shadow = true;
  out.anim = 'flap';
  return out;
};

const water: MovementFn = (onPath, input, out) => {
  out.x = onPath.x;
  out.y = input.inWater
    ? Math.round(onPath.y + WATER.swimSinkPx + bob(input, WATER.swimBobPx, WATER.bobHz))
    : Math.round(onPath.y - WATER.bubbleLiftPx + bob(input, WATER.bubbleBobPx, WATER.bobHz));
  out.shadow = false;
  out.anim = input.inWater ? 'swim' : 'walk';
  return out;
};

export const MOVEMENT_STRATEGIES: Readonly<Record<Movement, MovementFn>> = { land, sky, water };

export const movementFor = (movement: Movement): MovementFn => MOVEMENT_STRATEGIES[movement];

export const createPlacement = (): Placement => ({ x: 0, y: 0, shadow: false, anim: 'walk' });
