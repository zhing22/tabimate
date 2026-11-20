import type { KAPLAYCtx } from 'kaplay';
import type { BiomeId } from '@/config/biomes';
import type { DateKey } from '@/core/types';
import { createBackdrops } from './backdrop';
import { loadBiomeArt } from './biomes/load';
import { loadBorderArt } from './borders/load';
import type { SceneryDeps } from './drawScenery';
import { dominantBiome, type WorldState } from './strip';

/**
 * Loads the biome and border art once, for the live scene and the results
 * stills alike, and keeps the page colour above the scene in step with the sky.
 */
export function setupScenery(
  k: KAPLAYCtx,
  options: { readonly puzzleDate: DateKey; readonly reducedMotion: boolean },
) {
  const scenery: SceneryDeps = {
    art: loadBiomeArt(k),
    borders: loadBorderArt(k),
    seed: options.puzzleDate,
    reducedMotion: options.reducedMotion,
  };
  let skyShown: BiomeId | null = null;
  return {
    scenery,
    backdrop: createBackdrops(scenery),
    /** Rows above the scene show the sky's top colour; set only when it changes. */
    syncSky: (container: HTMLElement, state: WorldState) => {
      const sky = dominantBiome(state);
      if (sky === skyShown) return;
      skyShown = sky;
      container.style.backgroundColor = scenery.art[sky].sky[0];
    },
  };
}
