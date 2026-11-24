// Every bird look, a registry by archetype (scripts/lib/placeholder/avian.ts
// draws them). A look is data: pose, sizes, beak, tail, crest, which slot
// colours what, and its marks. Species sharing a look differ by palette.
import { FLIGHTLESS_BIRD_LOOKS } from './avianLooksFlightless.ts';
import { GROUND_BIRD_LOOKS } from './avianLooksGround.ts';
import { PREY_BIRD_LOOKS } from './avianLooksPrey.ts';
import type { MarkName } from './avianMarks.ts';
import type { CrestShape } from './avianCrests.ts';
import type { BeakShape, TailShape } from './avianParts.ts';
import { SMALL_BIRD_LOOKS } from './avianLooksSmall.ts';
import { WATER_BIRD_LOOKS } from './avianLooksWater.ts';
import type { Key } from './grid.ts';

export interface AvianLook {
  /** perch: upright on two short legs; stand: level body, with legs and a neck. */
  readonly pose: 'perch' | 'stand';
  /** Body radii, head radius, leg length, neck length (px). */
  readonly size: readonly [rx: number, ry: number];
  readonly head: number;
  readonly legs: number;
  readonly neck?: number;
  readonly beak: BeakShape;
  /** Which slot colours what: the beak defaults to the accent, legs to dark. */
  readonly beakKey?: Key;
  readonly tail?: TailShape;
  readonly tailLen?: number;
  readonly tailKey?: Key;
  readonly crest?: CrestShape;
  readonly crestKey?: Key;
  /** A hood or bare head in another slot (a bald eagle's white, a mallard's green). */
  readonly headKey?: Key;
  readonly neckKey?: Key;
  readonly legKey?: Key;
  readonly marks?: readonly MarkName[];
  /** How far the wing reaches in flight. */
  readonly wing?: number;
}

export const AVIAN_LOOKS = {
  ...PREY_BIRD_LOOKS,
  ...GROUND_BIRD_LOOKS,
  ...FLIGHTLESS_BIRD_LOOKS,
  ...SMALL_BIRD_LOOKS,
  ...WATER_BIRD_LOOKS,
};
