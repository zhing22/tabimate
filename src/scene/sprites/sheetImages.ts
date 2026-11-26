// Turning a downloaded sheet into what the pixel provider registers: its
// pixels and frames, canvases, UI stills, its movement tags, and the dev list
// of animals left without a sprite.
import { representativeFor } from '@/core/hierarchy';
import type { PortraitImage } from '@/core/portrait';
import type { Animal, AnimalId } from '@/core/types';
import { makeCanvas, portraitFrom } from './canvasArt';
import type { AnimalArt, Palette } from '@/config/render';
import type { Pixels } from './recolor';
import { parseAsepriteSheet, type SheetInfo } from './sheet';
import { untrimmed } from './sheetLayout';

/** What the provider needs about colours and sheets (see data/spriteArtSource). */
export interface PixelArt {
  readonly palettes: ReadonlyMap<string, Palette>;
  readonly animals: ReadonlyMap<AnimalId, AnimalArt>;
  readonly sheets: readonly string[];
}

/** A sheet's image and frame data, loaded once per archetype. */
export interface LoadedSheet {
  readonly info: SheetInfo;
  readonly pixels: Pixels;
}

/**
 * Reads a downloaded sheet (see data/spriteArtSource loadSheetFiles): its
 * pixels, and its frames, which must lie inside the image.
 */
export function readSheet(files: { json: unknown; image: HTMLImageElement }): LoadedSheet {
  const { width, height } = files.image;
  const info = parseAsepriteSheet(files.json, { width, height });
  // A trimmed export is laid out untrimmed once, here: the scene and the UI
  // then draw the same frames, anchored the same way.
  const layout = untrimmed(info);
  if (!layout) {
    const { ctx } = makeCanvas(width, height);
    ctx.drawImage(files.image, 0, 0);
    return { info, pixels: ctx.getImageData(0, 0, width, height) };
  }
  const w = info.frameWidth * info.frames.length;
  const { ctx } = makeCanvas(w, info.frameHeight);
  for (const { from, toX, toY } of layout.copies)
    ctx.drawImage(files.image, from.x, from.y, from.w, from.h, toX, toY, from.w, from.h);
  return { info: layout.info, pixels: ctx.getImageData(0, 0, w, info.frameHeight) };
}

/** The sheet's walk, flap and swim frames, those it has. */
export const movementTags = (info: SheetInfo) => {
  const { walk, flap, swim } = info.tags;
  return { ...(walk ? { walk } : {}), ...(flap ? { flap } : {}), ...(swim ? { swim } : {}) };
};

export function toCanvas({ width, height, data }: Pixels): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(width, height);
  ctx.putImageData(new ImageData(new Uint8ClampedArray(data), width, height), 0, 0);
  return canvas;
}

/**
 * A UI still from a recoloured sheet: its first frame, plus a cycle (its walk,
 * or the `tag` asked for if the sheet has it) laid out in one row so the page
 * can play it in place.
 */
export function portraitOfSheet(pixels: Pixels, sheet: SheetInfo, tag = 'walk'): PortraitImage {
  const canvas = toCanvas(pixels);
  const still = portraitFrom(canvas, sheet.frames[0]!, false);
  const walk = sheet.tags[tag] ?? sheet.tags.walk;
  if (!walk) return still;
  const frames = walk.to - walk.from + 1;
  const { canvas: strip, ctx } = makeCanvas(sheet.frameWidth * frames, sheet.frameHeight);
  for (let i = 0; i < frames; i++) {
    const f = sheet.frames[walk.from + i]!;
    ctx.drawImage(canvas, f.x, f.y, f.w, f.h, i * sheet.frameWidth, 0, f.w, f.h);
  }
  return { ...still, walk: { src: strip.toDataURL('image/png'), frames, fps: walk.fps } };
}

/**
 * Dev only: which animals fall back to emoji, grouped by the archetype whose
 * sheet (or colours) would draw them, so the missing art is easy to spot. The
 * full list across all days is npm run sprite-coverage.
 */
export function warnMissing(missing: readonly Animal[], lookup: ReadonlyMap<AnimalId, Animal>) {
  if (missing.length === 0) return;
  const byArchetype = new Map<string, string[]>();
  for (const animal of missing) {
    const archetype = representativeFor(animal, lookup).archetype;
    byArchetype.set(archetype, [...(byArchetype.get(archetype) ?? []), animal.id]);
  }
  const lines = [...byArchetype].map(([archetype, ids]) => `  ${archetype}: ${ids.join(', ')}`);
  const header = `No pixel sprite for ${missing.length} animal(s); drawn as emoji:`;
  console.warn([header, ...lines].join('\n'));
}
