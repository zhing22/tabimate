import type { KAPLAYCtx } from 'kaplay';
import type { BiomeId } from '@/config/biomes';
import type { HexColour } from '@/config/colour';
import { makeCanvas } from '../sprites/canvasArt';
import { BIOME_ART } from './registry';
import type { Painter } from './types';

interface Placed {
  readonly sprite: string;
  readonly width: number;
  readonly height: number;
}

/** A biome's art, painted and registered with Kaplay under these sprite names. */
export interface BiomeArtSprites {
  readonly sky: readonly [HexColour, HexColour];
  readonly layers: readonly (Placed & { readonly y: number; readonly parallax: number })[];
  readonly props: readonly (Placed & { readonly minGap: number; readonly maxGap: number })[];
  /** Widest prop, so props just off the left edge still get drawn. */
  readonly maxPropWidth: number;
}

function paint(k: KAPLAYCtx, name: string, source: Painter, width: number, height: number) {
  const { canvas, ctx } = makeCanvas(width, height);
  source(ctx, width, height);
  k.loadSprite(name, canvas);
  return name;
}

/** Paints every biome's layers and props once, at start-up. */
export function loadBiomeArt(k: KAPLAYCtx): Readonly<Record<BiomeId, BiomeArtSprites>> {
  const out = {} as Record<BiomeId, BiomeArtSprites>;
  for (const art of Object.values(BIOME_ART)) {
    const layers = art.layers.map((layer, i) => ({
      ...layer,
      sprite: paint(k, `${art.id}/layer${i}`, layer.source, layer.width, layer.height),
    }));
    const props = art.props.map((prop, i) => ({
      ...prop,
      sprite: paint(k, `${art.id}/prop${i}`, prop.source, prop.width, prop.height),
    }));
    const maxPropWidth = Math.max(0, ...props.map((p) => p.width));
    out[art.id] = { sky: art.sky, layers, props, maxPropWidth };
  }
  return out;
}
