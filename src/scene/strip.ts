// The journey as one continuous strip. Each biome starts at the distance its
// score threshold puts it (config/biomes.ts x DISTANCE_PER_POINT). A border of
// BIOME_BORDER px is centred on each start: the scenery blends from one biome
// into the next across it, and is half way (the next biome mostly in view)
// exactly at the start, so what the scene shows always agrees with the score's
// biome. Pure: no Kaplay.
import { BIOMES, type BiomeId } from '@/config/biomes';
import { BIOME_BORDER } from '@/config/render';
import { distanceFor } from '@/core/journey';

export interface BiomeStop {
  readonly id: BiomeId;
  /** World x where this biome starts (its score threshold): the middle of its border. */
  readonly startX: number;
}

/** Where a biome's border ends and it is fully in view (the first biome: at once). */
const fullX = (stop: BiomeStop): number => (stop.startX === 0 ? 0 : stop.startX + BIOME_BORDER / 2);

/** Where the border before a biome begins. */
export const borderStartX = (stop: BiomeStop): number => fullX(stop) - BIOME_BORDER;

export const BIOME_STOPS: readonly BiomeStop[] = BIOMES.map((b) => ({
  id: b.id,
  startX: distanceFor(b.minScore),
}));

/** Where on the strip a world x is. Mutable, so a frame can reuse one object. */
export interface WorldState {
  /**
   * The biome being left: the last one fully in view at x. Its own start
   * may be behind x inside a border; dominantBiome() is the score's biome.
   */
  biome: BiomeId;
  /** The biome after it, or null past the last start. */
  nextBiome: BiomeId | null;
  /** 0..1 across the border into nextBiome (0.5 at its start); 0 outside a border. */
  blend: number;
  /** BIOME_STOPS index of `biome`. */
  index: number;
}

export const createWorldState = (): WorldState => ({
  biome: BIOME_STOPS[0]!.id,
  nextBiome: BIOME_STOPS[1]?.id ?? null,
  blend: 0,
  index: 0,
});

/**
 * The biome at world x, the next one, and how far through the border between
 * them x is. Writes into `out` (allocates nothing when one is passed).
 */
export function worldStateAt(x: number, out: WorldState = createWorldState()): WorldState {
  let i = 0;
  while (i + 1 < BIOME_STOPS.length && fullX(BIOME_STOPS[i + 1]!) <= x) i++;
  const next = BIOME_STOPS[i + 1];
  out.index = i;
  out.biome = BIOME_STOPS[i]!.id;
  out.nextBiome = next ? next.id : null;
  out.blend = next ? Math.min(1, Math.max(0, (x - borderStartX(next)) / BIOME_BORDER)) : 0;
  return out;
}

/**
 * The biome mostly in view: switches half way through a border, which is
 * exactly at the biome's start, so it always equals the score's biome.
 */
export const dominantBiome = (state: WorldState): BiomeId =>
  state.nextBiome !== null && state.blend >= 0.5 ? state.nextBiome : state.biome;

/** Reduced motion: no blend, a cut at the biome's start (the middle of its border). */
export function cutBlend(state: WorldState): WorldState {
  state.blend = state.blend >= 0.5 ? 1 : 0;
  return state;
}

/** The middle of the border into BIOME_STOPS[i] (i >= 1), its start: where its title card shows. */
export const gatewayX = (i: number): number => BIOME_STOPS[i]?.startX ?? Infinity;

/**
 * Which biome a prop at world x belongs to, given its seeded roll (0..1): in a
 * border, the next biome's props become likelier the further in, so both
 * biomes' props mix there. With `cut`, the border switches at the start instead.
 */
export function biomeOfProp(x: number, roll: number, cut: boolean, scratch: WorldState): BiomeId {
  worldStateAt(x, scratch);
  const blend = cut ? cutBlend(scratch).blend : scratch.blend;
  return scratch.nextBiome !== null && roll < blend ? scratch.nextBiome : scratch.biome;
}
