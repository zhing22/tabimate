// The journey as one continuous strip. Each biome starts at the distance its
// score threshold puts it (config/biomes.ts x DISTANCE_PER_POINT); the BIOME_BORDER
// px before each start blend from one biome into the next. Pure: no Kaplay.
import { BIOMES, type BiomeId } from '@/config/biomes';
import { BIOME_BORDER } from '@/config/render';
import { distanceFor } from '@/core/journey';

export interface BiomeStop {
  readonly id: BiomeId;
  /** World x where this biome is fully in view. */
  readonly startX: number;
}

export const BIOME_STOPS: readonly BiomeStop[] = BIOMES.map((b) => ({
  id: b.id,
  startX: distanceFor(b.minScore),
}));

/** Where on the strip a world x is. Mutable, so a frame can reuse one object. */
export interface WorldState {
  /** The biome x is in (the last one whose start it has reached). */
  biome: BiomeId;
  /** The biome after it, or null past the last start. */
  nextBiome: BiomeId | null;
  /** 0..1 across the border before nextBiome's start; 0 outside a border. */
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
  while (i + 1 < BIOME_STOPS.length && BIOME_STOPS[i + 1]!.startX <= x) i++;
  const next = BIOME_STOPS[i + 1];
  out.index = i;
  out.biome = BIOME_STOPS[i]!.id;
  out.nextBiome = next ? next.id : null;
  out.blend = next
    ? Math.min(1, Math.max(0, (x - (next.startX - BIOME_BORDER)) / BIOME_BORDER))
    : 0;
  return out;
}

/** The biome mostly in view: switches halfway through a border (sky colour, ambience). */
export const dominantBiome = (state: WorldState): BiomeId =>
  state.nextBiome !== null && state.blend >= 0.5 ? state.nextBiome : state.biome;

/** The middle of the border before BIOME_STOPS[i] (i >= 1): where its title card shows. */
export const gatewayX = (i: number): number =>
  (BIOME_STOPS[i]?.startX ?? Infinity) - BIOME_BORDER / 2;

/**
 * Which biome a prop at world x belongs to, given its seeded roll (0..1): in a
 * border, the next biome's props become likelier the further in, so both
 * biomes' props mix there. With `cut`, the border switches at the start instead.
 */
export function biomeOfProp(x: number, roll: number, cut: boolean, scratch: WorldState): BiomeId {
  worldStateAt(x, scratch);
  const blend = cut ? 0 : scratch.blend;
  return scratch.nextBiome !== null && roll < blend ? scratch.nextBiome : scratch.biome;
}
