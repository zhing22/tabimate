/** Where to draw copies of a repeating layer so they cover the view seamlessly. */
export interface Tiling {
  /** Screen x of the first copy (0 or less). */
  firstX: number;
  copies: number;
}

/**
 * A layer of width w moving at `parallax` draws ceil(drawWidth / w) + 1 copies,
 * starting at -((cameraX × parallax) mod w). The offset is rounded to whole
 * native pixels: a layer at a fractional position would shimmer. Writes into
 * `out` (a frame passes one scratch object, so it allocates nothing).
 */
export function tile(
  cameraX: number,
  parallax: number,
  width: number,
  drawWidth: number,
  out: Tiling = { firstX: 0, copies: 0 },
): Tiling {
  const offset = Math.round(cameraX * parallax);
  const shift = ((offset % width) + width) % width; // mod that stays positive going left
  out.firstX = -shift;
  out.copies = Math.ceil(drawWidth / width) + 1;
  return out;
}
