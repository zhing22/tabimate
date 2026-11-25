import type { BiomeId } from '@/config/biomes';
import { BACKDROP, BACKDROP_GROUND_Y, BACKDROP_HEIGHT, NATIVE_HEIGHT } from '@/config/render';
import { distanceFor } from '@/core/journey';
import type { BackdropImage } from '@/core/portrait';
import type { BiomeArtSprites } from './biomes/load';
import type { BorderSprites } from './borders/load';
import type { BorderKey } from './borders/registry';
import { createSceneryRenderer, type SceneryBackend } from './drawScenery';
import { makeCanvas } from './sprites/canvasArt';
import { cutBlend, worldStateAt } from './strip';

export interface BackdropDeps {
  readonly art: Readonly<Record<BiomeId, BiomeArtSprites>>;
  readonly borders: ReadonlyMap<BorderKey, BorderSprites>;
  readonly seed: string;
  readonly reducedMotion: boolean;
}

/** Scenery drawn on a 2D canvas, for the still. */
function canvasBackend(ctx: CanvasRenderingContext2D): SceneryBackend {
  return {
    image(piece, x, y, opacity) {
      ctx.globalAlpha = opacity;
      ctx.drawImage(piece.canvas, x, y);
      ctx.globalAlpha = 1;
    },
    sky(top, bottom, width) {
      const gradient = ctx.createLinearGradient(0, 0, 0, NATIVE_HEIGHT);
      gradient.addColorStop(0, `rgb(${top.r} ${top.g} ${top.b})`);
      gradient.addColorStop(1, `rgb(${bottom.r} ${bottom.g} ${bottom.b})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, NATIVE_HEIGHT);
    },
  };
}

/**
 * The scenery where a run ended (world x = distanceFor(score), centred), with
 * the same scenery code as the live scene: the same biome, blend, props and
 * border art the player was standing in. Cropped to the strip around the walk
 * line (BACKDROP): the results line-up stands in it.
 */
export function paintBackdrop(deps: BackdropDeps, score: number): BackdropImage {
  const x = distanceFor(score);
  const { canvas, ctx } = makeCanvas(BACKDROP.width, NATIVE_HEIGHT);
  const state = worldStateAt(x);
  if (deps.reducedMotion) cutBlend(state);
  createSceneryRenderer(canvasBackend(ctx), deps)(
    state,
    Math.round(x - BACKDROP.width / 2),
    BACKDROP.width,
  );
  const { canvas: out, ctx: crop } = makeCanvas(BACKDROP.width, BACKDROP_HEIGHT);
  crop.drawImage(
    canvas,
    0,
    BACKDROP.top,
    BACKDROP.width,
    BACKDROP_HEIGHT,
    0,
    0,
    BACKDROP.width,
    BACKDROP_HEIGHT,
  );
  return {
    src: out.toDataURL('image/png'),
    width: BACKDROP.width,
    height: BACKDROP_HEIGHT,
    groundY: BACKDROP_GROUND_Y,
  };
}

/** One painted still per final score, made on first ask. */
export function createBackdrops(deps: BackdropDeps) {
  const made = new Map<number, BackdropImage>();
  return (score: number): BackdropImage => {
    let image = made.get(score);
    if (!image) {
      image = paintBackdrop(deps, score);
      made.set(score, image);
    }
    return image;
  };
}
