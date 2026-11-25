import { TEMPLATE_KEYS } from '@/config/render';
import { representativeFor } from '@/core/hierarchy';
import type { PortraitImage, Portraits } from '@/core/portrait';
import type { Animal, AnimalLookup, Movement } from '@/core/types';
import { spritePalette } from './paletteUtils';
import { playerStill } from './playerArt';
import { recolor, type Pixels } from './recolor';
import type { SheetInfo } from './sheet';
import { portraitOfSheet, type LoadedSheet, type PixelArt } from './sheetImages';

export interface StillPortraitOptions {
  readonly loadArt: () => Promise<PixelArt>;
  readonly loadSheet: (archetype: string) => Promise<LoadedSheet>;
  /** Every animal, so a group finds its representative. */
  readonly animals: AnimalLookup;
  /** The traveller's still (playerArt.ts); tests swap it out. */
  readonly player?: () => PortraitImage | null;
  /** Makes the UI still and its cycle. Tests swap it out. */
  readonly toPortrait?: (pixels: Pixels, sheet: SheetInfo, tag: string) => PortraitImage;
}

/** The cycle a portrait plays: how the animal gets about (the sheet's walk if it lacks it). */
const MOVE_TAG: Readonly<Record<Movement, string>> = { land: 'walk', sky: 'flap', water: 'swim' };

/**
 * Pixel portraits of any animal, for the UI (the Field Journal), without the
 * scene: the scene registers sprites for today's animals only. Each sheet and
 * each portrait is made once, on first ask; null asks for the traveller
 * (code-drawn, no sheet). Null where there is no sheet or
 * palette, or something failed to load: the UI shows the emoji.
 */
export function createStillPortraits(options: StillPortraitOptions): Portraits {
  let art: Promise<PixelArt> | undefined;
  const sheets = new Map<string, Promise<LoadedSheet>>();
  const made = new Map<string, Promise<PortraitImage | null>>();
  let warned = false; // one warning, not one per animal
  let player: Promise<PortraitImage | null> | undefined;
  const sources: Sources = {
    options,
    art: () => (art ??= options.loadArt()),
    sheet: (archetype) =>
      sheets.get(archetype) ?? sheets.set(archetype, options.loadSheet(archetype)).get(archetype)!,
  };

  return (animal, shiny) => {
    if (!animal) return (player ??= Promise.resolve((options.player ?? playerStill)()));
    const key = `${animal.id}${shiny ? '/shiny' : ''}`;
    let image = made.get(key);
    if (!image) {
      image = makePortrait(animal, shiny, sources).catch((error: unknown) => {
        if (!warned) console.warn(`Portraits failed (first: ${animal.id}); showing emoji.`, error);
        warned = true;
        return null;
      });
      made.set(key, image);
    }
    return image;
  };
}

/** The art and sheets, each loaded once and shared by every portrait. */
interface Sources {
  readonly options: StillPortraitOptions;
  readonly art: () => Promise<PixelArt>;
  readonly sheet: (archetype: string) => Promise<LoadedSheet>;
}

/** One portrait: the source animal's sheet in its colours, playing how it moves. */
async function makePortrait(
  animal: Animal,
  shiny: boolean,
  { options, art, sheet }: Sources,
): Promise<PortraitImage | null> {
  const { animals, palettes, sheets } = await art();
  const source = representativeFor(animal, options.animals);
  const colours = animals.get(source.id);
  if (!colours || !sheets.includes(source.archetype)) return null;
  const palette = spritePalette(colours, shiny, palettes, source !== animal);
  if (!palette) return null;
  const loaded = await sheet(source.archetype);
  const { pixels } = recolor(loaded.pixels, TEMPLATE_KEYS, palette);
  const toPortrait = options.toPortrait ?? portraitOfSheet;
  return toPortrait(pixels, loaded.info, MOVE_TAG[animal.movement]);
}
