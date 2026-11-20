// How followers that don't walk get about (scene/entities/movement.ts).
import type { BiomeId } from './biomes';

/** Sky animals hover over their spot on the trail, bobbing, with a shadow below. */
export const SKY = {
  /** Height above the walk line, native px. */
  hoverPx: 18,
  bobPx: 3,
  bobHz: 0.6,
  /** The ground shadow: an ellipse this fraction of the sprite's width, and its opacity. */
  shadowWidth: 0.6,
  shadowOpacity: 0.25,
} as const;

/**
 * Water animals ride in a bubble on land and swim where there is water: the
 * bubble pops (popMs) when the party walks into a swimming biome.
 */
export const WATER = {
  /** In the bubble: lifted off the ground, bobbing gently. */
  bubbleLiftPx: 4,
  bubbleBobPx: 1.5,
  bobHz: 0.8,
  /** The bubble's radius as a fraction of the sprite's size, and its outline opacity. */
  bubbleRadius: 0.75,
  bubbleOpacity: 0.7,
  /** Swimming: sunk this far below the walk line, bobbing a little. */
  swimSinkPx: 4,
  swimBobPx: 1,
  popMs: 250,
  /** Biomes with water to swim in. */
  swimBiomes: ['wetland'] as readonly BiomeId[],
} as const;
