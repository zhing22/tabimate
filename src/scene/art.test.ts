import { describe, expect, it } from 'vitest';
import { BIOMES } from '@/config/biomes';
import { NATIVE_HEIGHT, PLAYER_SIZE } from '@/config/render';
import { BIOME_ART } from './biomes/registry';
import { darken, lighten, mix } from './colour';
import { PLAYER_PIXELS } from './sprites/playerArt';

describe('biome art', () => {
  it('has art for every biome, under its own id', () => {
    for (const biome of BIOMES) {
      expect(BIOME_ART[biome.id].id).toBe(biome.id);
    }
  });

  it('keeps every layer inside the scene, back to front by parallax', () => {
    for (const art of Object.values(BIOME_ART)) {
      for (const layer of art.layers) {
        expect(layer.y).toBeGreaterThanOrEqual(0);
        expect(layer.y + layer.height).toBeLessThanOrEqual(NATIVE_HEIGHT);
      }
      const parallax = art.layers.map((l) => l.parallax);
      expect(parallax).toEqual([...parallax].sort((a, b) => a - b));
    }
  });

  it('keeps props at most 48 px tall and gaps sensible', () => {
    for (const art of Object.values(BIOME_ART)) {
      for (const prop of art.props) {
        expect(prop.height).toBeLessThanOrEqual(48);
        expect(prop.minGap).toBeGreaterThan(0);
        expect(prop.maxGap).toBeGreaterThanOrEqual(prop.minGap);
      }
    }
  });
});

describe('player art', () => {
  it('is exactly PLAYER_SIZE', () => {
    expect(PLAYER_PIXELS).toHaveLength(PLAYER_SIZE.height);
    for (const row of PLAYER_PIXELS) expect(row).toHaveLength(PLAYER_SIZE.width);
  });
});

describe('colour', () => {
  it('mixes, darkens and lightens hex colours', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(darken('#ff8000', 1)).toBe('#000000');
    expect(lighten('#000000', 0)).toBe('#000000');
    expect(lighten('#204060', 0.5)).toBe('#90a0b0');
  });
});
