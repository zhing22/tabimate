// Palettes for animals that have none yet, made from each animal's tint and
// snapped to the master palette, so every animal with a sheet draws as pixels.
// Existing palettes and palette fields are never changed.
import type { HexColour } from '../../../src/config/colour.ts';
import { DERIVED_PALETTE } from '../../../src/config/placeholderArt.ts';
import {
  contrastRatio,
  deriveShades,
  snapToPalette,
} from '../../../src/scene/sprites/paletteUtils.ts';

type Shade = 'shadow' | 'highlight';
const STEPS = 3;

/** The next snapped shade of `hex` that differs from it (or the last tried). */
function stepFrom(hex: HexColour, way: Shade, master: readonly HexColour[]): HexColour {
  let raw = hex;
  let snapped = hex;
  for (let i = 0; i < STEPS && snapped === hex; i++) {
    raw = deriveShades(raw)[way];
    snapped = snapToPalette(raw, master);
  }
  return snapped;
}

/** outline, base, shadow, highlight, accent, eye: see DERIVED_PALETTE. */
export function derivePalette(tint: HexColour, master: readonly HexColour[]): HexColour[] {
  const base = snapToPalette(tint, master);
  const shadow = stepFrom(base, 'shadow', master);
  const { darkEye, lightEye, eyeContrast } = DERIVED_PALETTE;
  return [
    DERIVED_PALETTE.outline,
    base,
    shadow,
    stepFrom(base, 'highlight', master),
    stepFrom(shadow, 'shadow', master),
    contrastRatio(base, darkEye) >= eyeContrast ? darkEye : lightEye,
  ];
}

export interface RawAnimal {
  readonly id: string;
  readonly tint: HexColour;
  palette?: string;
  [field: string]: unknown;
}

/**
 * Gives each animal in `ids` without a palette one named after its id (made
 * from its tint unless palettes.json already has that name). Mutates both;
 * returns the ids it gave a palette.
 */
export function addDerivedPalettes(
  animals: RawAnimal[],
  palettes: Record<string, HexColour[]>,
  master: readonly HexColour[],
  ids: ReadonlySet<string>,
): string[] {
  const added: string[] = [];
  for (const animal of animals) {
    if (animal.palette !== undefined || !ids.has(animal.id)) continue;
    palettes[animal.id] ??= derivePalette(animal.tint, master);
    animal.palette = animal.id;
    added.push(animal.id);
  }
  return added;
}
