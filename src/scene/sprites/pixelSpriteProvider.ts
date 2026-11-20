import type { ImageSource, KAPLAYCtx, SpriteAnims } from 'kaplay';
import { TEMPLATE_KEYS, type AnimalArt } from '@/config/render';
import { representativeFor } from '@/core/hierarchy';
import type { PortraitImage } from '@/core/portrait';
import type { Animal } from '@/core/types';
import { blinkPalette, plainPalette, resolvePalette } from './paletteUtils';
import { recolor, type Pixels } from './recolor';
import type { SheetInfo } from './sheet';
import {
  movementTags,
  portraitOfSheet,
  toCanvas,
  warnMissing,
  type LoadedSheet,
  type PixelArt,
} from './sheetImages';
import type { SpriteProvider, SpriteRef } from './spriteProvider';

export { readSheet, type LoadedSheet, type PixelArt } from './sheetImages';

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
    /** A group drawn as its representative: plainer colours (its shiny stays as designed). */
    plain: boolean,
  ) {
    const pair: SpriteRef[] = [];
    for (const shiny of [false, true]) {
      const resolved = resolvePalette(art, shiny, palettes);
      if (!resolved) return; // validation makes this rare; the emoji stands in
      const palette = plain && !shiny ? plainPalette(art.palette, resolved, palettes) : resolved;
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
        ...movementTags(sheet.info),
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
      // Each sheet loaded once, however many animals use it.
      const sheets = new Map<string, Promise<LoadedSheet | null>>();
      const loadOnce = (archetype: string) =>
        options.loadSheet(archetype).catch((error: unknown) => {
          console.warn(`Sprite sheet "${archetype}" could not be loaded; using emoji.`, error);
          return null;
        });
      const sheetFor = (archetype: string) =>
        sheets.get(archetype) ?? sheets.set(archetype, loadOnce(archetype)).get(archetype)!;
      // A group ("penguin") has no art of its own: it is drawn as its representative.
      const lookup = new Map(list.map((a) => [a.id, a]));
      await Promise.all(
        list.map(async (animal) => {
          const source = representativeFor(animal, lookup);
          const colours = art.animals.get(source.id);
          if (!colours || !art.sheets.includes(source.archetype)) return;
          const sheet = await sheetFor(source.archetype);
          if (sheet) await build(animal, colours, art.palettes, sheet, source !== animal);
        }),
      );
      const missing = list.filter((animal) => !refs.has(animal));
      if (import.meta.env.DEV) warnMissing(missing, lookup);
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
