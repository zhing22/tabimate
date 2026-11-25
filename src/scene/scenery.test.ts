import { describe, expect, it } from 'vitest';
import { BIOMES, type BiomeId } from '@/config/biomes';
import { BIOME_BORDER, TITLE_CARD } from '@/config/render';
import type { BiomeArtSprites } from './biomes/load';
import type { BorderSprites } from './borders/load';
import { BORDERS, borderKey, type BorderKey } from './borders/registry';
import { createSceneryRenderer, type Rgb, type SceneryBackend } from './drawScenery';
import { titleCardOpacity } from './drawTitleCard';
import { BIOME_STOPS, gatewayX, worldStateAt } from './strip';

const canvas = {} as HTMLCanvasElement;
const piece = (sprite: string, width = 100, height = 20) => ({ sprite, canvas, width, height });

/** Two layers per biome (back, then ground), no props, sky black to white. */
const fakeArt = (id: BiomeId): BiomeArtSprites => ({
  sky: ['#000000', '#ffffff'],
  layers: [
    { ...piece(`${id}/back`), y: 40, parallax: 0.5 },
    { ...piece(`${id}/ground`), y: 140, parallax: 1 },
  ],
  props: [],
  maxPropWidth: 0,
});
const art = Object.fromEntries(BIOMES.map((b) => [b.id, fakeArt(b.id)])) as Record<
  BiomeId,
  BiomeArtSprites
>;

interface Drawn {
  sprite: string;
  x: number;
  opacity: number;
}

function recorder() {
  const drawn: Drawn[] = [];
  const skies: Rgb[] = [];
  const backend: SceneryBackend = {
    image: (p, x, _y, opacity) => drawn.push({ sprite: p.sprite, x, opacity }),
    sky: (top) => skies.push({ ...top }),
  };
  return { drawn, skies, backend };
}

const grassland = BIOME_STOPS[1]!.startX;
const opacityOf = (drawn: Drawn[], sprite: string) =>
  drawn.find((d) => d.sprite === sprite)?.opacity;

describe('scenery renderer', () => {
  const draw = (x: number, borders = new Map<BorderKey, BorderSprites>()) => {
    const r = recorder();
    createSceneryRenderer(r.backend, { art, borders, seed: 's', reducedMotion: false })(
      worldStateAt(x),
      x - 100,
      200,
    );
    return r;
  };

  it('draws only the current biome outside a border', () => {
    const { drawn } = draw(0);
    expect(drawn.every((d) => d.sprite.startsWith('town/'))).toBe(true);
    expect(opacityOf(drawn, 'town/back')).toBe(1);
  });

  it('fades each layer from one biome to the next, the ground layer staying solid', () => {
    const { drawn, skies } = draw(grassland + BIOME_BORDER / 4); // blend 0.75
    expect(opacityOf(drawn, 'town/back')).toBeCloseTo(0.25);
    expect(opacityOf(drawn, 'grassland/back')).toBeCloseTo(0.75);
    expect(opacityOf(drawn, 'town/ground')).toBe(1);
    expect(opacityOf(drawn, 'grassland/ground')).toBeCloseTo(0.75);
    // The current biome's layer is drawn under the next one's.
    const order = drawn.map((d) => d.sprite);
    expect(order.indexOf('town/back')).toBeLessThan(order.indexOf('grassland/back'));
    expect(skies[0]).toEqual({ r: 0, g: 0, b: 0 }); // both skies black here
  });

  it('places the border ground tiles across the segment and the gateway at its middle', () => {
    const borders = new Map<BorderKey, BorderSprites>([
      [
        borderKey('town', 'grassland'),
        { groundTile: piece('tile', 32, 40), gateway: piece('gate', 20, 28) },
      ],
    ]);
    const x = gatewayX(1);
    const { drawn } = draw(x, borders);
    const camera = x - 100;
    const tiles = drawn.filter((d) => d.sprite === 'tile').map((d) => d.x + camera);
    expect(tiles.length).toBeGreaterThan(0);
    for (const t of tiles) {
      expect(t).toBeGreaterThanOrEqual(grassland - BIOME_BORDER / 2);
      expect(t).toBeLessThan(grassland + BIOME_BORDER / 2);
    }
    const gate = drawn.find((d) => d.sprite === 'gate')!;
    expect(gate.x + camera + 10).toBe(gatewayX(1));
  });

  it('falls back to the blend alone for a pair without border art', () => {
    const { drawn } = draw(gatewayX(1));
    expect(drawn.every((d) => !['tile', 'gate'].includes(d.sprite))).toBe(true);
  });
});

describe('border registry', () => {
  it('keys only real neighbouring biomes, from one to the next', () => {
    const pairs = new Set(BIOME_STOPS.slice(1).map((s, i) => borderKey(BIOME_STOPS[i]!.id, s.id)));
    for (const key of Object.keys(BORDERS)) expect(pairs.has(key as BorderKey)).toBe(true);
  });
});

describe('titleCardOpacity', () => {
  it('fades in, holds, and fades out within TITLE_CARD.totalMs', () => {
    const { fadeMs, totalMs } = TITLE_CARD;
    expect(titleCardOpacity(0)).toBe(0);
    expect(titleCardOpacity(fadeMs / 2000)).toBeCloseTo(0.5);
    expect(titleCardOpacity(totalMs / 2000)).toBe(1);
    expect(titleCardOpacity((totalMs - fadeMs / 2) / 1000)).toBeCloseTo(0.5);
    expect(titleCardOpacity(totalMs / 1000)).toBe(0);
  });
});
