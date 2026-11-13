import type { Palette } from '@/config/render';
import { hexToRgb, rgbToHex } from './paletteUtils';

/** RGBA pixels, like ImageData but constructible anywhere (tests run in Node). */
export interface Pixels {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export interface Recolored {
  readonly pixels: Pixels;
  /** Opaque colours that are not template keys, left as they were. Should be empty. */
  readonly unknown: readonly string[];
}

const key = (r: number, g: number, b: number) => (r << 16) | (g << 8) | b;

/**
 * Swaps each template key colour for the palette colour in the same slot.
 * Exact matches only, alpha kept. A colour that is not a key (a stray pixel
 * in the sheet) is left as it is and reported, so it can be fixed in Aseprite.
 */
export function recolor(
  source: Pixels,
  templateKeys: readonly string[],
  palette: Palette,
): Recolored {
  const swaps = new Map<number, readonly [number, number, number]>();
  templateKeys.forEach((hex, slot) => {
    const target = palette[slot];
    if (target) swaps.set(key(...hexToRgb(hex)), hexToRgb(target));
  });
  const data = new Uint8ClampedArray(source.data);
  const unknown = new Set<number>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue; // transparent: whatever its RGB, it doesn't show
    const k = key(data[i]!, data[i + 1]!, data[i + 2]!);
    const to = swaps.get(k);
    if (to) {
      data[i] = to[0];
      data[i + 1] = to[1];
      data[i + 2] = to[2];
    } else {
      unknown.add(k);
    }
  }
  return {
    pixels: { width: source.width, height: source.height, data },
    unknown: [...unknown].map((k) => rgbToHex([(k >> 16) & 255, (k >> 8) & 255, k & 255])),
  };
}
