import type { HexColour } from '@/config/colour';
import type { AnimalArt } from '@/config/render';
import type { AnimalId } from '@/core/types';
import { DataError } from './dataError';
import { createJsonReader, item } from './jsonReader';
import {
  validateAnimalArt,
  validateMasterPalette,
  validatePalettes,
  type PaletteRegistry,
} from './validateArt';

export const PALETTES_FILE = 'data/palettes.json';
export const MASTER_PALETTE_FILE = 'data/master-palette.json';
export const SPRITE_MANIFEST_FILE = 'assets/sprites/manifest.json';
const ANIMALS_FILE = 'data/animals.json';

/** Everything the pixel sprites need besides the sheets themselves. */
export interface SpriteArt {
  readonly palettes: PaletteRegistry;
  readonly master: readonly HexColour[];
  readonly animals: ReadonlyMap<AnimalId, AnimalArt>;
  /** Archetypes that have a sheet in assets/sprites; the rest are drawn as emoji. */
  readonly sheets: readonly string[];
}

export interface SpriteArtOptions {
  readonly baseUrl: string;
  readonly fetch?: typeof fetch;
}

export const sheetUrls = (baseUrl: string, archetype: string) => {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return {
    image: `${base}assets/sprites/${archetype}.png`,
    json: `${base}assets/sprites/${archetype}.json`,
  };
};

/** Loads and validates palettes, the master palette, animal colours and the sheet list. */
export async function loadSpriteArt(options: SpriteArtOptions): Promise<SpriteArt> {
  const base = options.baseUrl.endsWith('/') ? options.baseUrl : `${options.baseUrl}/`;
  const fetchFn =
    options.fetch ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));
  const load = async (file: string): Promise<unknown> => {
    const response = await fetchFn(base + file).catch((error: unknown) => {
      throw new DataError(file, null, `could not be fetched (${String(error)})`);
    });
    if (!response.ok)
      throw new DataError(file, null, `could not be fetched (HTTP ${response.status})`);
    return response.json().catch(() => {
      throw new DataError(file, null, 'is not valid JSON');
    }) as Promise<unknown>;
  };

  const [palettesJson, masterJson, animalsJson, manifestJson] = await Promise.all(
    [PALETTES_FILE, MASTER_PALETTE_FILE, ANIMALS_FILE, SPRITE_MANIFEST_FILE].map(load),
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
