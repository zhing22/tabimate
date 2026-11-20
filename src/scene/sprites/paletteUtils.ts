import type { HexColour } from '@/config/colour';
import type { AnimalArt, Palette } from '@/config/render';
import { PLAIN_PALETTE } from '@/config/sprites';

type Rgb = readonly [number, number, number];

export const hexToRgb = (hex: string): Rgb => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const toHex = (n: number) =>
  Math.round(Math.min(255, Math.max(0, n)))
    .toString(16)
    .padStart(2, '0');
export const rgbToHex = ([r, g, b]: Rgb): HexColour => `#${toHex(r)}${toHex(g)}${toHex(b)}`;

/**
 * The colours an animal is drawn in: its palette (or shiny palette) with its
 * per-slot overrides on top. Overrides apply to the normal colouring only:
 * a shiny palette is designed whole. Null if a palette is missing.
 */
export function resolvePalette(
  art: AnimalArt,
  shiny: boolean,
  palettes: ReadonlyMap<string, Palette>,
): Palette | null {
  if (shiny && art.shinyPalette !== undefined) return palettes.get(art.shinyPalette) ?? null;
  const base = palettes.get(art.palette);
  if (!base) return null;
  if (shiny || !art.paletteOverride) return base;
  const overrides = art.paletteOverride;
  return base.map((hex, slot) => overrides[slot] ?? hex) as unknown as Palette;
}

/** One colour with its saturation scaled (0 grey, 1 unchanged). */
function desaturate(hex: HexColour, by: number): HexColour {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb(h, s * by, l));
}

/**
 * A group's plainer colours, from its representative's palette: the
 * "<name>-plain" palette if palettes.json has one, else the same palette
 * desaturated (outline and eyes kept, so it still reads as a character).
 */
export function plainPalette(
  name: string,
  palette: Palette,
  palettes: ReadonlyMap<string, Palette>,
): Palette {
  const designed = palettes.get(`${name}${PLAIN_PALETTE.suffix}`);
  if (designed) return designed;
  const by = PLAIN_PALETTE.saturation;
  return palette.map((hex, slot) =>
    slot === 0 || slot === 5 ? hex : desaturate(hex, by),
  ) as unknown as Palette;
}

/**
 * The colours a sprite is drawn in: resolvePalette, made plainer for a group
 * drawn as its representative (`plain`; its shiny stays as designed).
 */
export function spritePalette(
  art: AnimalArt,
  shiny: boolean,
  palettes: ReadonlyMap<string, Palette>,
  plain: boolean,
): Palette | null {
  const resolved = resolvePalette(art, shiny, palettes);
  if (!resolved || !plain || shiny) return resolved;
  return plainPalette(art.palette, resolved, palettes);
}

/** The same palette with the eyes (slot 5) closed: drawn in the base colour. */
export const blinkPalette = (palette: Palette): Palette =>
  [palette[0], palette[1], palette[2], palette[3], palette[4], palette[1]] as const;

function rgbToHsl([r, g, b]: Rgb): [number, number, number] {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === rn
      ? (gn - bn) / d + (gn < bn ? 6 : 0)
      : max === gn
        ? (bn - rn) / d + 2
        : (rn - gn) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Shadow and highlight for a base colour, the usual pixel-art way: the shadow
 * darker and shifted towards blue/purple, the highlight lighter and towards yellow.
 */
export function deriveShades(base: HexColour): { shadow: HexColour; highlight: HexColour } {
  const [h, s, l] = rgbToHsl(hexToRgb(base));
  const toward = (target: number, by: number) => {
    const diff = ((target - h + 540) % 360) - 180; // shortest way round the wheel
    return (h + Math.sign(diff) * Math.min(Math.abs(diff), by) + 360) % 360;
  };
  // Greys have no hue to shift: keep them neutral.
  const sat = (by: number) => (s === 0 ? 0 : clamp01(s + by));
  return {
    shadow: rgbToHex(hslToRgb(toward(250, 15), sat(0.05), clamp01(l - 0.18))),
    highlight: rgbToHex(hslToRgb(toward(55, 10), sat(-0.05), clamp01(l + 0.15))),
  };
}

/** The master palette colour nearest to `hex` (weighted RGB, close to how eyes judge it). */
export function snapToPalette(hex: HexColour, master: readonly HexColour[]): HexColour {
  const [r, g, b] = hexToRgb(hex);
  let best = master[0] ?? hex;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of master) {
    const [cr, cg, cb] = hexToRgb(candidate);
    const distance = 2 * (r - cr) ** 2 + 4 * (g - cg) ** 2 + 3 * (b - cb) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return best;
}

const luminance = (hex: string) => {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG contrast ratio, 1 (none) to 21 (black on white). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
