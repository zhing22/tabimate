/** Where to draw copies of a repeating layer so they cover the view seamlessly. */
export interface Tiling {
  /** Screen x of the first copy (0 or less). */
  readonly firstX: number;
  readonly copies: number;
}

/**
 * A layer of width w moving at `parallax` draws ceil(drawWidth / w) + 1 copies,
 * starting at -((cameraX × parallax) mod w). The offset is rounded to whole
 * native pixels: a layer at a fractional position would shimmer.
 */
export function tile(cameraX: number, parallax: number, width: number, drawWidth: number): Tiling {
  const offset = Math.round(cameraX * parallax);
  const shift = ((offset % width) + width) % width; // mod that stays positive going left
  return { firstX: -shift, copies: Math.ceil(drawWidth / width) + 1 };
}
