import type { KAPLAYCtx } from 'kaplay';
import { BIOMES, type BiomeId } from '@/config/biomes';
import type { DateKey } from '@/core/types';
import { createBackdrops } from './backdrop';
import { loadBiomeArt } from './biomes/load';
import { loadBorderArt } from './borders/load';
import type { SceneryDeps } from './drawScenery';
import { dominantBiome, type WorldState } from './strip';

/**
 * The scene area's colours for a biome: the sky's top colour above the scene,
 * its ground below it, and the frame style on very wide windows (base.css and
 * sceneFrame.css read these).
 */
export function paintSceneArea(container: HTMLElement, biome: BiomeId, skyTop: string): void {
  const def = BIOMES.find((b) => b.id === biome);
  container.style.setProperty('--scene-sky', skyTop);
  container.style.setProperty('--scene-ground', def?.palette.ground ?? skyTop);
  container.dataset['frame'] = def?.frame ?? '';
}

/**
 * Loads the biome and border art once, for the live scene and the results
 * stills alike, and keeps the scene area's colours in step with the biome.
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
    /** Sky above the scene, ground below and the frame follow the biome; set only when it changes. */
    syncSky: (container: HTMLElement, state: WorldState) => {
      const sky = dominantBiome(state);
      if (sky === skyShown) return;
      skyShown = sky;
      paintSceneArea(container, sky, scenery.art[sky].sky[0]);
    },
  };
}
