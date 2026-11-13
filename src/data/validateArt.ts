// Sprite colour data: palettes.json, master-palette.json and the palette fields
// of animals.json. Kept beside validate.ts; the game's Animal type (core) does
// not carry art, so these are read into their own maps.
import { PALETTE_SLOTS, type AnimalArt, type Palette } from '@/config/render';
import type { HexColour } from '@/config/colour';
import type { AnimalId } from '@/core/types';
import { createJsonReader, field, item, type JsonReader } from './jsonReader';

export type PaletteRegistry = ReadonlyMap<string, Palette>;

function palette(r: JsonReader, value: unknown, path: string): Palette {
  const list = r.array(value, path);
  if (list.length !== PALETTE_SLOTS) {
    r.fail(path, `must have exactly ${PALETTE_SLOTS} colours (got ${list.length})`);
  }
  return list.map((hex, i) => r.hex(hex, item(path, i))) as unknown as Palette;
}

/** palettes.json: an object of palette name -> 6 hex colours (slot order). */
export function validatePalettes(json: unknown, file: string): PaletteRegistry {
  const r = createJsonReader(file);
  const o = r.object(json, '');
  return new Map(Object.entries(o).map(([name, value]) => [name, palette(r, value, name)]));
}

/** master-palette.json: the hex colours every palette should come from. */
export function validateMasterPalette(json: unknown, file: string): readonly HexColour[] {
  const r = createJsonReader(file);
  const list = r.array(json, '');
  if (list.length === 0) r.fail('', 'must list at least one colour');
  return list.map((hex, i) => r.hex(hex, item('', i)));
}

function paletteName(r: JsonReader, value: unknown, path: string, palettes: PaletteRegistry) {
  const name = r.string(value, path);
  return palettes.has(name) ? name : r.fail(path, `palette "${name}" is not in palettes.json`);
}

function override(r: JsonReader, value: unknown, path: string) {
  const o = r.object(value, path);
  const out: Partial<Record<number, HexColour>> = {};
  for (const [slot, hex] of Object.entries(o)) {
    const n = Number(slot);
    if (!Number.isInteger(n) || n < 0 || n >= PALETTE_SLOTS || String(n) !== slot) {
      r.fail(field(path, slot), `is not a palette slot (0-${PALETTE_SLOTS - 1})`);
    }
    out[n] = r.hex(hex, field(path, slot));
  }
  return out;
}

/**
 * The palette fields of animals.json, for animals that have them (the rest
 * are drawn as emoji). `palette` is required once any art field is present.
 */
export function validateAnimalArt(
  json: unknown,
  file: string,
  palettes: PaletteRegistry,
): ReadonlyMap<AnimalId, AnimalArt> {
  const r = createJsonReader(file);
  const art = new Map<AnimalId, AnimalArt>();
  r.array(json, '').forEach((value, i) => {
    const path = item('', i);
    const o = r.object(value, path);
    if (o.palette === undefined && o.shinyPalette === undefined && !o.paletteOverride) return;
    art.set(r.string(o.id, field(path, 'id')), {
      palette: paletteName(r, o.palette, field(path, 'palette'), palettes),
      ...(o.shinyPalette === undefined
        ? {}
        : { shinyPalette: paletteName(r, o.shinyPalette, field(path, 'shinyPalette'), palettes) }),
      ...(o.paletteOverride === undefined
        ? {}
        : { paletteOverride: override(r, o.paletteOverride, field(path, 'paletteOverride')) }),
    });
  });
  return art;
}
