// Body plans, a registry: each draws one frame of a kind of body from its
// spec. A new kind of body is a new entry (and a spec type in PlanSpec).
import type { BirdSpec } from './bird.ts';
import { drawBird } from './bird.ts';
import { drawBug, type BugSpec } from './bug.ts';
import { drawFish, type FishSpec } from './fish.ts';
import type { Grid, Pose } from './grid.ts';
import { drawQuadruped, type QuadrupedSpec } from './quadruped.ts';
import { drawBlob, drawSerpent, type BlobSpec, type SerpentSpec } from './soft.ts';
import { drawUpright, type UprightSpec } from './upright.ts';

export type PlanSpec =
  QuadrupedSpec | UprightSpec | BirdSpec | BugSpec | FishSpec | SerpentSpec | BlobSpec;
type PlanName = PlanSpec['plan'];
type Drawer<P extends PlanName> = (
  g: Grid,
  pose: Pose,
  spec: Extract<PlanSpec, { plan: P }>,
) => void;

const PLANS: { readonly [P in PlanName]: Drawer<P> } = {
  quadruped: drawQuadruped,
  upright: drawUpright,
  bird: drawBird,
  bug: drawBug,
  fish: drawFish,
  serpent: drawSerpent,
  blob: drawBlob,
};

/** The cast is safe: PLANS maps each plan name to the drawer for that spec. */
export function drawPlan(g: Grid, pose: Pose, spec: PlanSpec): void {
  (PLANS[spec.plan] as Drawer<PlanName>)(g, pose, spec);
}
