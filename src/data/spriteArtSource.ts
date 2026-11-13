import type { HexColour } from '@/config/colour';
import type { AnimalArt } from '@/config/render';
import type { AnimalId } from '@/core/types';
import { DataError } from './dataError';
import { loadRequired, type JsonLoader } from './jsonLoader';
import { createJsonReader, item } from './jsonReader';
import { ANIMALS_FILE } from './localPuzzleSource';
import {
  validateAnimalArt,
  validateMasterPalette,
  validatePalettes,
  type PaletteRegistry,
} from './validateArt';

export const PALETTES_FILE = 'data/palettes.json';
export const MASTER_PALETTE_FILE = 'data/master-palette.json';
export const SPRITE_MANIFEST_FILE = 'assets/sprites/manifest.json';
export const sheetFiles = (archetype: string) => ({
  image: `assets/sprites/${archetype}.png`,
  json: `assets/sprites/${archetype}.json`,
});

/** Everything the pixel sprites need besides the sheets themselves. */
export interface SpriteArt {
  readonly palettes: PaletteRegistry;
  readonly master: readonly HexColour[];
  readonly animals: ReadonlyMap<AnimalId, AnimalArt>;
  /** Archetypes that have a sheet in assets/sprites; the rest are drawn as emoji. */
  readonly sheets: readonly string[];
}

/**
 * Loads and validates palettes, the master palette, animal colours and the
 * sheet list. animals.json comes through the shared loader, so the puzzle
 * source and this read one fetch.
 */
export async function loadSpriteArt(loader: JsonLoader): Promise<SpriteArt> {
  const [palettesJson, masterJson, animalsJson, manifestJson] = await Promise.all(
    [PALETTES_FILE, MASTER_PALETTE_FILE, ANIMALS_FILE, SPRITE_MANIFEST_FILE].map((file) =>
      loadRequired(loader, file),
    ),
  );
  const palettes = validatePalettes(palettesJson, PALETTES_FILE);
  const r = createJsonReader(SPRITE_MANIFEST_FILE);
  return {
    palettes,
    master: validateMasterPalette(masterJson, MASTER_PALETTE_FILE),
    animals: validateAnimalArt(animalsJson, ANIMALS_FILE, palettes),
    sheets: r.array(manifestJson, '').map((name, i) => r.string(name, item('', i))),
  };
}

/** An archetype's sheet as downloaded: Aseprite JSON plus the decoded image. */
export interface SheetFiles {
  readonly json: unknown;
  readonly image: HTMLImageElement;
}

function loadImage(url: string, file: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new DataError(file, null, 'could not be loaded'));
    image.src = url;
  });
}

/** Downloads one archetype's sheet. A missing JSON file says so, by name. */
export async function loadSheetFiles(loader: JsonLoader, archetype: string): Promise<SheetFiles> {
  const files = sheetFiles(archetype);
  const [json, image] = await Promise.all([
    loadRequired(loader, files.json),
    loadImage(loader.url(files.image), files.image),
  ]);
  return { json, image };
}
