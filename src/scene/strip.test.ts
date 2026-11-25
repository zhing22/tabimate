import { describe, expect, it } from 'vitest';
import { BIOMES } from '@/config/biomes';
import { BIOME_BORDER } from '@/config/render';
import { biomeFor, distanceFor } from '@/core/journey';
import {
  BIOME_STOPS,
  biomeOfProp,
  createWorldState,
  dominantBiome,
  gatewayX,
  worldStateAt,
} from './strip';

const grassland = BIOME_STOPS[1]!.startX;

describe('BIOME_STOPS', () => {
  it('puts each biome at the distance of its score threshold, town at 0', () => {
    expect(BIOME_STOPS.map((s) => s.id)).toEqual(BIOMES.map((b) => b.id));
    expect(BIOME_STOPS[0]!.startX).toBe(0);
    expect(grassland).toBe(distanceFor(50));
  });
});

describe('worldStateAt', () => {
  it.each<[string, number, string, string | null, number]>([
    ['the start', 0, 'town', 'grassland', 0],
    ['just before the border', grassland - BIOME_BORDER / 2, 'town', 'grassland', 0],
    ['a quarter through', grassland - BIOME_BORDER / 4, 'town', 'grassland', 0.25],
    ['half way: the start', grassland, 'town', 'grassland', 0.5],
    ['past the border', grassland + BIOME_BORDER / 2, 'grassland', 'forest', 0],
    ['past the last start', 100_000, 'snowy-peak', null, 0],
  ])('%s', (_name, x, biome, nextBiome, blend) => {
    expect(worldStateAt(x)).toMatchObject({ biome, nextBiome, blend });
  });

  it('writes into the object it is given, so a frame allocates nothing', () => {
    const out = createWorldState();
    expect(worldStateAt(grassland + BIOME_BORDER / 2, out)).toBe(out);
    expect(out.index).toBe(1);
  });

  it('shows mostly the score-based biome wherever the player stands (x = distanceFor(score))', () => {
    for (let score = 0; score <= 700; score += 5) {
      expect(dominantBiome(worldStateAt(distanceFor(score)))).toBe(biomeFor(score).id);
    }
  });
});

describe('dominantBiome, gatewayX and biomeOfProp', () => {
  it('switches the dominant biome at the start, half way through its border', () => {
    expect(dominantBiome(worldStateAt(grassland - 1))).toBe('town');
    expect(dominantBiome(worldStateAt(grassland))).toBe('grassland');
  });

  it('puts each gateway at its biome start, the middle of its border', () => {
    expect(gatewayX(1)).toBe(grassland);
  });

  it('mixes props in a border by their roll, and cuts at the start with reduced motion', () => {
    const scratch = createWorldState();
    const quarter = grassland - BIOME_BORDER / 4; // blend 0.25
    expect(biomeOfProp(quarter, 0.1, false, scratch)).toBe('grassland');
    expect(biomeOfProp(quarter, 0.6, false, scratch)).toBe('town');
    expect(biomeOfProp(quarter, 0.1, true, scratch)).toBe('town'); // cut: no mixing
    expect(biomeOfProp(grassland + BIOME_BORDER / 2, 0.1, true, scratch)).toBe('grassland');
  });
});
