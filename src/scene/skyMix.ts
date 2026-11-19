import type { BiomeId } from '@/config/biomes';
import type { BiomeArtSprites } from './biomes/load';
import { hexToRgb } from './sprites/paletteUtils';
import type { WorldState } from './strip';

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const rgb = (hex: string): Rgb => {
  const [r, g, b] = hexToRgb(hex);
  return { r, g, b };
};

/** Linear mix of two colours into `out` (no allocation). */
function mixInto(out: Rgb, a: Rgb, b: Rgb, t: number) {
  out.r = Math.round(a.r + (b.r - a.r) * t);
  out.g = Math.round(a.g + (b.g - a.g) * t);
  out.b = Math.round(a.b + (b.b - a.b) * t);
}

/**
 * The sky's top and bottom colours at a place on the strip, mixed between the
 * biome and the next by blend. Colours are parsed once; each call writes into
 * the same two objects, so a frame allocates nothing.
 */
export function createSkyMix(art: Readonly<Record<BiomeId, BiomeArtSprites>>) {
  const sky = { top: rgb('#000000'), bottom: rgb('#000000') };
  const colours = new Map<BiomeId, readonly [Rgb, Rgb]>();
  for (const [id, a] of Object.entries(art) as [BiomeId, BiomeArtSprites][]) {
    colours.set(id, [rgb(a.sky[0]), rgb(a.sky[1])]);
  }
  return (state: WorldState): { readonly top: Rgb; readonly bottom: Rgb } => {
    const from = colours.get(state.biome)!;
    const to = state.nextBiome ? colours.get(state.nextBiome)! : from;
    mixInto(sky.top, from[0], to[0], state.blend);
    mixInto(sky.bottom, from[1], to[1], state.blend);
    return sky;
  };
}
