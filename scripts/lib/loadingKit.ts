// Composing the loading kit's pixels (scripts/build-loading-kit.ts). Pure:
// plain RGBA buffers in, one buffer out, so it is tested without files.
import type { Pixels } from '../../src/scene/sprites/recolor.ts';
import type { FrameRect, SheetInfo } from '../../src/scene/sprites/sheet.ts';

/** One character's walk: its frames' rectangles in `pixels`, each at `offsets` in a box of `box`. */
export interface KitRow {
  readonly pixels: Pixels;
  readonly frames: readonly FrameRect[];
  readonly offsets: readonly { readonly x: number; readonly y: number }[];
  readonly box: { readonly width: number; readonly height: number };
}

export interface Cell {
  readonly width: number;
  readonly height: number;
}

const blank = (width: number, height: number): Pixels => ({
  width,
  height,
  data: new Uint8ClampedArray(width * height * 4),
});

/** Copies the opaque pixels of `rect` in `src` to (dx, dy) in `dst`. */
function blit(dst: Pixels, src: Pixels, rect: FrameRect, dx: number, dy: number): void {
  for (let y = 0; y < rect.h; y++) {
    for (let x = 0; x < rect.w; x++) {
      const from = ((rect.y + y) * src.width + rect.x + x) * 4;
      if (src.data[from + 3] === 0) continue;
      const to = ((dy + y) * dst.width + dx + x) * 4;
      dst.data.set(src.data.subarray(from, from + 4), to);
    }
  }
}

/** A walk from a sheet: `count` frames of its tag (the sheet's own layout and offsets). */
export function sheetRow(pixels: Pixels, info: SheetInfo, tag: string, count: number): KitRow {
  const walk = info.tags[tag];
  if (!walk || walk.to - walk.from + 1 !== count) {
    throw new Error(`the sheet's "${tag}" tag must have ${count} frames`);
  }
  const range = (list: readonly FrameRect[] | readonly { x: number; y: number }[]) =>
    list.slice(walk.from, walk.to + 1);
  return {
    pixels,
    frames: range(info.frames) as FrameRect[],
    offsets: range(info.offsets),
    box: { width: info.frameWidth, height: info.frameHeight },
  };
}

/** A walk drawn as text rows (playerArt.ts): one character per pixel, '.' transparent. */
export function textRow(
  frames: readonly (readonly string[])[],
  colours: Readonly<Record<string, string>>,
): KitRow {
  const height = frames[0]!.length;
  const width = frames[0]![0]!.length;
  const pixels = blank(width * frames.length, height);
  frames.forEach((rows, i) =>
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const hex = colours[row[x]!];
        if (!hex) continue;
        const n = Number.parseInt(hex.slice(1), 16);
        pixels.data.set(
          [n >> 16, (n >> 8) & 255, n & 255, 255],
          (y * pixels.width + i * width + x) * 4,
        );
      }
    }),
  );
  return {
    pixels,
    frames: frames.map((_, i) => ({ x: i * width, y: 0, w: width, h: height })),
    offsets: frames.map(() => ({ x: 0, y: 0 })),
    box: { width, height },
  };
}

/**
 * The kit: one row of cells per character, a frame per cell, each frame's box
 * anchored bottom-centre in its cell (feet on the cell's floor) and its pixels
 * at their offset in the box, as the scene draws them.
 */
export function composeKit(rows: readonly KitRow[], cell: Cell, frames: number): Pixels {
  const out = blank(cell.width * frames, cell.height * rows.length);
  rows.forEach((row, r) => {
    if (row.box.width > cell.width || row.box.height > cell.height) {
      throw new Error(`a ${row.box.width}x${row.box.height} frame doesn't fit the kit's cell`);
    }
    const left = Math.floor((cell.width - row.box.width) / 2);
    const top = r * cell.height + cell.height - row.box.height;
    for (let i = 0; i < frames; i++) {
      const offset = row.offsets[i]!;
      blit(out, row.pixels, row.frames[i]!, i * cell.width + left + offset.x, top + offset.y);
    }
  });
  return out;
}
