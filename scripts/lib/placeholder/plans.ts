// Body plans, a registry: each draws one frame of a kind of body from its
// spec. A new kind of body is a new entry (and a spec type in PlanSpec).
import { drawBear, type BearSpec } from './bear.ts';
import type { BirdSpec } from './bird.ts';
import { drawBird } from './bird.ts';
import { drawBug, type BugSpec } from './bug.ts';
import { drawElephant, type ElephantSpec } from './elephant.ts';
import { drawFish, type FishSpec } from './fish.ts';
import type { Grid, Pose } from './grid.ts';
import { drawParrot, type ParrotSpec } from './parrot.ts';
import { drawPenguin, type PenguinSpec } from './penguin.ts';
import { drawPrimate, type PrimateSpec } from './primate.ts';
import { drawQuadruped, type QuadrupedSpec } from './quadruped.ts';
import { drawRabbit, type RabbitSpec } from './rabbit.ts';
import { drawShark, type SharkSpec } from './shark.ts';
import { drawBlob, drawSerpent, type BlobSpec, type SerpentSpec } from './soft.ts';
import { drawWhale, type WhaleSpec } from './whale.ts';

export type PlanSpec =
  | QuadrupedSpec
  | BearSpec
  | PrimateSpec
  | ParrotSpec
  | ElephantSpec
  | RabbitSpec
  | PenguinSpec
  | BirdSpec
  | BugSpec
  | FishSpec
  | SharkSpec
  | WhaleSpec
  | SerpentSpec
  | BlobSpec;
type PlanName = PlanSpec['plan'];
type Drawer<P extends PlanName> = (
  g: Grid,
  pose: Pose,
  spec: Extract<PlanSpec, { plan: P }>,
) => void;

const PLANS: { readonly [P in PlanName]: Drawer<P> } = {
  quadruped: drawQuadruped,
  bear: drawBear,
  elephant: drawElephant,
  rabbit: drawRabbit,
  primate: drawPrimate,
  parrot: drawParrot,
  penguin: drawPenguin,
  bird: drawBird,
  bug: drawBug,
  fish: drawFish,
  shark: drawShark,
  whale: drawWhale,
  serpent: drawSerpent,
  blob: drawBlob,
};

/**
 * Plans that colour every pixel themselves (a penguin's white front is its
 * highlight slot, a bear's muzzle, a shark's or whale's belly too), so the lit-top, shadowed-underside pass would spoil them.
 */
const SELF_SHADED: ReadonlySet<PlanName> = new Set([
  'penguin',
  'bear',
  'elephant',
  'rabbit',
  'primate',
  'parrot',
  'shark',
  'whale',
]);

export const shadesItself = (spec: PlanSpec): boolean => SELF_SHADED.has(spec.plan);

/** The cast is safe: PLANS maps each plan name to the drawer for that spec. */
export function drawPlan(g: Grid, pose: Pose, spec: PlanSpec): void {
  (PLANS[spec.plan] as Drawer<PlanName>)(g, pose, spec);
}
