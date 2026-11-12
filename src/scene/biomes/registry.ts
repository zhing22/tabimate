import type { BiomeId } from '@/config/biomes';
import { forest } from './forest';
import { grassland } from './grassland';
import { town } from './town';
import type { BiomeArt } from './types';

/** Art for every biome in config/biomes.ts; the type makes a missing one a compile error. */
export const BIOME_ART: Readonly<Record<BiomeId, BiomeArt>> = { town, grassland, forest };
