import type { BiomeId } from '@/config/biomes';
import { forest } from './forest';
import { grassland } from './grassland';
import { rainforest } from './rainforest';
import { rockyHills } from './rockyHills';
import { snowyPeak } from './snowyPeak';
import { town } from './town';
import type { BiomeArt } from './types';
import { wetland } from './wetland';

/** Art for every biome in config/biomes.ts; the type makes a missing one a compile error. */
export const BIOME_ART: Readonly<Record<BiomeId, BiomeArt>> = {
  town,
  grassland,
  forest,
  'rocky-hills': rockyHills,
  rainforest,
  wetland,
  'snowy-peak': snowyPeak,
};
