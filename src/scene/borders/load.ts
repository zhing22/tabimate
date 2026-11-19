import type { KAPLAYCtx } from 'kaplay';
import { makeCanvas } from '../sprites/canvasArt';
import { BORDERS, type BorderKey, type BorderPiece } from './registry';

/** A border piece painted once and registered with Kaplay. */
export interface BorderSprite {
  readonly sprite: string;
  readonly canvas: HTMLCanvasElement;
  readonly width: number;
  readonly height: number;
}

export interface BorderSprites {
  readonly groundTile?: BorderSprite;
  readonly gateway?: BorderSprite;
}

function paint(k: KAPLAYCtx, name: string, piece: BorderPiece): BorderSprite {
  const { canvas, ctx } = makeCanvas(piece.width, piece.height);
  piece.source(ctx, piece.width, piece.height);
  k.loadSprite(name, canvas);
  return { sprite: name, canvas, width: piece.width, height: piece.height };
}

/** Paints every border's art once, at start-up. */
export function loadBorderArt(k: KAPLAYCtx): ReadonlyMap<BorderKey, BorderSprites> {
  const out = new Map<BorderKey, BorderSprites>();
  for (const [key, art] of Object.entries(BORDERS) as [BorderKey, (typeof BORDERS)[BorderKey]][]) {
    if (!art) continue;
    out.set(key, {
      ...(art.groundTile ? { groundTile: paint(k, `border/${key}/ground`, art.groundTile) } : {}),
      ...(art.gateway ? { gateway: paint(k, `border/${key}/gateway`, art.gateway) } : {}),
    });
  }
  return out;
}
