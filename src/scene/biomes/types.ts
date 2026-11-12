import type { BiomeId } from '@/config/biomes';
import type { HexColour } from '@/config/colour';
import type { LayerSpec } from '@/config/render';
import type { PropRule } from '../props';

/**
 * Draws art onto a canvas of the given native size. Placeholder art is drawn
 * this way in code; Step 8b can point the same slots at image files instead.
 */
export type Painter = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

export interface LayerArt extends LayerSpec {
  readonly source: Painter;
}

export interface PropArt extends PropRule {
  readonly height: number;
  readonly source: Painter;
}

/** Everything a biome looks like. Add a biome: a module like town.ts + a registry entry. */
export interface BiomeArt {
  readonly id: BiomeId;
  /** Sky gradient, top then bottom. The top colour also fills rows above the scene. */
  readonly sky: readonly [HexColour, HexColour];
  /** Back to front. Every layer repeats seamlessly left to right. */
  readonly layers: readonly LayerArt[];
  readonly props: readonly PropArt[];
}
