import type { ImageSource, KAPLAYCtx, SpriteAnims } from 'kaplay';
import { TEMPLATE_KEYS, type AnimalArt, type Palette } from '@/config/render';
import { representativeFor } from '@/core/hierarchy';
import type { PortraitImage } from '@/core/portrait';
import type { Animal, AnimalId } from '@/core/types';
import { makeCanvas, portraitFrom } from './canvasArt';
import { blinkPalette, resolvePalette } from './paletteUtils';
import { recolor, type Pixels } from './recolor';
import { parseAsepriteSheet, type SheetInfo } from './sheet';
import type { SpriteProvider, SpriteRef } from './spriteProvider';

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

export interface PixelSpriteOptions {
  /** Colours and the list of sheets; loaded inside load(), so start-up isn't held up. */
  readonly loadArt: () => Promise<PixelArt>;
  readonly loadSheet: (archetype: string) => Promise<LoadedSheet>;
  /** Draws everything without a sheet or palette (and the player, for now). */
  readonly fallback: SpriteProvider;
  /** Turns recoloured pixels into something Kaplay can load. Tests swap it out. */
  readonly toImage?: (pixels: Pixels) => ImageSource;
  /** Turns a recoloured sheet's first frame into a UI still. Tests swap it out. */
  readonly toPortrait?: (pixels: Pixels, sheet: SheetInfo) => PortraitImage;
}

/**
 * Reads a downloaded sheet (see data/spriteArtSource loadSheetFiles): its
 * pixels, and its frames, which must lie inside the image.
 */
export function readSheet(files: { json: unknown; image: HTMLImageElement }): LoadedSheet {
  const { width, height } = files.image;
  const { ctx } = makeCanvas(width, height);
  ctx.drawImage(files.image, 0, 0);
  return {
    info: parseAsepriteSheet(files.json, { width, height }),
    pixels: ctx.getImageData(0, 0, width, height),
  };
}

function toCanvas({ width, height, data }: Pixels): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(width, height);
  ctx.putImageData(new ImageData(new Uint8ClampedArray(data), width, height), 0, 0);
  return canvas;
}

/**
 * A UI still from a recoloured sheet: its first frame, plus its walk cycle
 * laid out in one row so the page can play it in place.
 */
function portraitOfSheet(pixels: Pixels, sheet: SheetInfo): PortraitImage {
  const canvas = toCanvas(pixels);
  const still = portraitFrom(canvas, sheet.frames[0]!, false);
  const walk = sheet.tags.walk;
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
 * Real pixel sprites: each archetype's sheet is recoloured once per animal
 * (and once more for shiny, and for the blink frames) from palettes.json, and
 * registered with Kaplay with its frame tags. Anything without a sheet or a
 * palette is drawn by the fallback (emoji).
 */
export function createPixelSpriteProvider(
  k: KAPLAYCtx,
  options: PixelSpriteOptions,
): SpriteProvider {
  const refs = new Map<Animal, readonly [plain: SpriteRef, shiny: SpriteRef]>();
  const warned = new Set<string>();
  const toImage = options.toImage ?? toCanvas;
  const toPortrait = options.toPortrait ?? portraitOfSheet;
  // Each sprite's recoloured sheet, made into a portrait on first ask.
  const stills = new Map<string, { pixels: Pixels; sheet: SheetInfo; image?: PortraitImage }>();

  const register = (name: string, pixels: Pixels, sheet: SheetInfo) => {
    const { width, height } = pixels;
    const frames = sheet.frames.map((f) =>
      k.quad(f.x / width, f.y / height, f.w / width, f.h / height),
    );
    const anims: SpriteAnims = {};
    for (const [tag, t] of Object.entries(sheet.tags))
      anims[tag] = { from: t.from, to: t.to, loop: true, speed: t.fps };
    return new Promise<void>((resolve, reject) => {
      k.loadSprite(name, toImage(pixels), { frames, anims })
        .onLoad(() => resolve())
        .onError(reject);
    });
  };

  async function build(
    animal: Animal,
    art: AnimalArt,
    palettes: PixelArt['palettes'],
    sheet: LoadedSheet,
  ) {
    const pair: SpriteRef[] = [];
    for (const shiny of [false, true]) {
      const palette = resolvePalette(art, shiny, palettes);
      if (!palette) return; // validation makes this rare; the emoji stands in
      const name = `pixel/${animal.id}${shiny ? '/shiny' : ''}`;
      const open = recolor(sheet.pixels, TEMPLATE_KEYS, palette);
      stills.set(name, { pixels: open.pixels, sheet: sheet.info });
      const shut = recolor(sheet.pixels, TEMPLATE_KEYS, blinkPalette(palette));
      if (import.meta.env.DEV && open.unknown.length > 0 && !warned.has(animal.archetype)) {
        warned.add(animal.archetype);
        console.warn(`${animal.archetype} sheet has non-template colours:`, open.unknown.join(' '));
      }
      await Promise.all([
        register(name, open.pixels, sheet.info),
        register(`${name}/blink`, shut.pixels, sheet.info),
      ]);
      pair.push({
        name,
        blinkName: `${name}/blink`,
        facesLeft: false,
        ...(sheet.info.tags.walk ? { walk: sheet.info.tags.walk } : {}),
      });
    }
    refs.set(animal, [pair[0]!, pair[1]!]);
  }

  return {
    async load(animals) {
      const list = [...animals];
      await options.fallback.load(list);
      let art: PixelArt;
      try {
        art = await options.loadArt();
      } catch (error) {
        console.warn('Sprite colours could not be loaded; drawing emoji instead.', error);
        return;
      }
      const sheets = new Map<string, Promise<LoadedSheet | null>>();
      const sheetFor = (archetype: string) => {
        if (!sheets.has(archetype)) {
          sheets.set(
            archetype,
            options.loadSheet(archetype).catch((error: unknown) => {
              console.warn(`Sprite sheet "${archetype}" could not be loaded; using emoji.`, error);
              return null;
            }),
          );
        }
        return sheets.get(archetype)!;
      };
      // A group ("penguin") has no art of its own: it is drawn as its representative.
      const lookup = new Map(list.map((a) => [a.id, a]));
      await Promise.all(
        list.map(async (animal) => {
          const source = representativeFor(animal, lookup);
          const colours = art.animals.get(source.id);
          if (!colours || !art.sheets.includes(source.archetype)) return;
          const sheet = await sheetFor(source.archetype);
          if (sheet) await build(animal, colours, art.palettes, sheet);
        }),
      );
    },
    spriteFor: (animal, shiny) =>
      refs.get(animal)?.[shiny ? 1 : 0] ?? options.fallback.spriteFor(animal, shiny),
    playerSprite: () => options.fallback.playerSprite(),
    portrait(animal, shiny) {
      const ref = animal ? refs.get(animal)?.[shiny ? 1 : 0] : undefined;
      const still = ref && stills.get(ref.name);
      if (!still) return options.fallback.portrait(animal, shiny);
      still.image ??= toPortrait(still.pixels, still.sheet);
      return still.image;
    },
  };
}
