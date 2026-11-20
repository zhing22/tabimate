import type { BiomeId } from '@/config/biomes';
import { BIOME_BORDER, LAYERS, PROP_BASE_Y } from '@/config/render';
import type { BiomeArtSprites } from './biomes/load';
import type { BorderSprites } from './borders/load';
import { borderKey, type BorderKey } from './borders/registry';
import { tile, type Tiling } from './layers';
import { createPropCache, segmentsInView, type SegmentRange } from './props';
import { createSkyMix, type Rgb } from './skyMix';
import {
  BIOME_STOPS,
  biomeOfProp,
  createWorldState,
  gatewayX,
  worldStateAt,
  type WorldState,
} from './strip';

export type { Rgb } from './skyMix';

/** A painted piece: its Kaplay sprite name, and the canvas it was painted on. */
export interface Piece {
  readonly sprite: string;
  readonly canvas: HTMLCanvasElement;
}

/**
 * Where scenery is drawn: Kaplay for the live scene (renderer.ts), a 2D canvas
 * for the results snapshot (backdrop.ts). The scenery logic is written once.
 */
export interface SceneryBackend {
  image(piece: Piece, x: number, y: number, opacity: number): void;
  /** The sky, top colour to bottom colour, across `width`. */
  sky(top: Rgb, bottom: Rgb, width: number): void;
}

export interface SceneryDeps {
  readonly art: Readonly<Record<BiomeId, BiomeArtSprites>>;
  readonly borders: ReadonlyMap<BorderKey, BorderSprites>;
  /** Seeds where props stand: everyone sees the same walk that day. */
  readonly seed: string;
  /** Borders cut at the biome's start: no blend, no mixed props. */
  readonly reducedMotion: boolean;
}

/**
 * Draws the scenery for a camera position and a place on the strip: the sky
 * mixed between two biomes by blend, each parallax layer of the current biome
 * at 1 - blend under the next one's at blend (the bottom ground layer stays
 * solid, so the ground never turns see-through), border ground tiles and
 * gateways, and props, mixed from both biomes inside a border. Colours and
 * scratch state are made once: a frame allocates nothing of ours.
 */
export function createSceneryRenderer(backend: SceneryBackend, deps: SceneryDeps) {
  const { art, borders, seed, reducedMotion } = deps;
  const skyAt = createSkyMix(art);
  const propsFor = createPropCache<BiomeId>(seed, (id) => art[id].props);
  const scratch = createWorldState();
  const edge = createWorldState();
  const tiling: Tiling = { firstX: 0, copies: 0 };
  const segments: SegmentRange = { first: 0, last: 0 };

  function drawLayer(
    layer: BiomeArtSprites['layers'][number] | undefined,
    opacity: number,
    cameraX: number,
    width: number,
  ) {
    if (!layer || opacity <= 0) return;
    const { firstX, copies } = tile(cameraX, layer.parallax, layer.width, width, tiling);
    for (let c = 0; c < copies; c++) {
      backend.image(layer, firstX + c * layer.width, layer.y, opacity);
    }
  }

  function drawLayers(state: WorldState, cameraX: number, width: number) {
    const current = art[state.biome].layers;
    const next = state.nextBiome && state.blend > 0 ? art[state.nextBiome].layers : null;
    const last = current.length - 1;
    for (let i = 0; i <= last; i++) {
      drawLayer(current[i], i === last ? 1 : 1 - state.blend, cameraX, width);
      drawLayer(next?.[i], state.blend, cameraX, width);
    }
  }

  /** Border ground tiles and gateways for every border in view. */
  function drawBorders(cameraX: number, width: number) {
    for (let i = 1; i < BIOME_STOPS.length; i++) {
      const end = BIOME_STOPS[i]!.startX;
      const start = end - BIOME_BORDER;
      if (end < cameraX || start > cameraX + width) continue;
      const border = borders.get(borderKey(BIOME_STOPS[i - 1]!.id, BIOME_STOPS[i]!.id));
      const ground = border?.groundTile;
      for (let x = start; ground && x < end; x += ground.width) {
        if (x + ground.width < cameraX || x > cameraX + width) continue;
        backend.image(ground, x - cameraX, LAYERS.ground.y, 1);
      }
      const gate = border?.gateway;
      if (gate) {
        const x = Math.round(gatewayX(i) - gate.width / 2 - cameraX);
        backend.image(gate, x, PROP_BASE_Y - gate.height, 1);
      }
    }
  }

  /** Props of every biome that can be in view, each where its biome owns the ground. */
  function drawProps(cameraX: number, width: number) {
    const first = worldStateAt(cameraX, edge).index;
    const last = Math.min(BIOME_STOPS.length - 1, worldStateAt(cameraX + width, edge).index + 1);
    for (let i = first; i <= last; i++) {
      const id = BIOME_STOPS[i]!.id;
      const a = art[id];
      segmentsInView(cameraX, width, a.maxPropWidth, segments);
      for (let s = segments.first; s <= segments.last; s++) {
        const list = propsFor(i, id, s);
        for (let n = 0; n < list.length; n++) {
          const p = list[n]!;
          const prop = a.props[p.kind]!;
          const x = p.x - cameraX;
          if (x > width || x + prop.width < 0) continue;
          if (biomeOfProp(p.x, p.roll, reducedMotion, scratch) !== id) continue;
          backend.image(prop, x, PROP_BASE_Y - prop.height, 1);
        }
      }
    }
  }

  return (state: WorldState, cameraX: number, width: number) => {
    const sky = skyAt(state);
    backend.sky(sky.top, sky.bottom, width);
    drawLayers(state, cameraX, width);
    drawBorders(cameraX, width);
    drawProps(cameraX, width);
  };
}
