import type { HexColour } from '@/config/colour';

const channels = (hex: HexColour): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');

/** a blended toward b by t (0 = a, 1 = b). For deriving shades of biome colours. */
export function mix(a: HexColour, b: HexColour, t: number): HexColour {
  const ca = channels(a);
  const cb = channels(b);
  return `#${ca.map((c, i) => toHex(c + (cb[i]! - c) * t)).join('')}`;
}

export const darken = (hex: HexColour, t: number): HexColour => mix(hex, '#000000', t);
export const lighten = (hex: HexColour, t: number): HexColour => mix(hex, '#ffffff', t);
