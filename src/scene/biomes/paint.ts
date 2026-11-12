// Shape helpers for placeholder biome art. Everything here tiles: anything
// drawn across the right edge is drawn again at the left.
import type { HexColour } from '@/config/colour';
import type { Random } from '../random';

export function rect(
  ctx: CanvasRenderingContext2D,
  colour: string,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.fillStyle = colour;
  const width = ctx.canvas.width;
  for (const shift of [0, -width, width]) {
    const left = Math.round(x) + shift;
    if (left < width && left + w > 0) ctx.fillRect(left, Math.round(y), w, h);
  }
}

/**
 * A ridge line filled to the bottom: hills, mountains, treelines. The waves
 * repeat a whole number of times across the width, so the ends meet.
 */
export function ridge(
  ctx: CanvasRenderingContext2D,
  colour: HexColour,
  base: number,
  waves: readonly (readonly [repeats: number, height: number])[],
  random: Random,
): void {
  const { width, height } = ctx.canvas;
  const phases = waves.map(() => random() * Math.PI * 2);
  ctx.fillStyle = colour;
  for (let x = 0; x < width; x++) {
    let y = base;
    waves.forEach(([repeats, amp], i) => {
      y += Math.sin((x / width) * Math.PI * 2 * repeats + phases[i]!) * amp;
    });
    const top = Math.round(y);
    ctx.fillRect(x, top, 1, height - top);
  }
}

/** A pine tree: stacked, widening rows of a triangle on a short trunk. */
export function pine(
  ctx: CanvasRenderingContext2D,
  colour: string,
  trunk: string,
  x: number,
  bottom: number,
  height: number,
): void {
  const maxHalf = Math.max(2, Math.round(height / 3));
  const body = height - 3;
  rect(ctx, trunk, x - 1, bottom - 3, 2, 3);
  for (let row = 0; row < body; row++) {
    // Widens downwards in steps of 4 rows, for the layered look of a pine.
    const half = Math.floor((row / body) * maxHalf + (row % 4) * 0.5);
    rect(ctx, colour, x - half, bottom - height + row, half * 2 + 1, 1);
  }
}

/** Speckles: n single pixels of colour placed at random inside a box. */
export function speckle(
  ctx: CanvasRenderingContext2D,
  colour: string,
  n: number,
  box: { x: number; y: number; w: number; h: number },
  random: Random,
): void {
  for (let i = 0; i < n; i++) {
    rect(ctx, colour, box.x + random() * box.w, box.y + random() * box.h, 1, 1);
  }
}
