// Draws the placeholder big-cat sheet (public/assets/sprites/big-cat.png + .json)
// in the template key colours, in Aseprite's export format, so the pixel
// pipeline has real input before hand-drawn art exists. Run: npm run art:sample
// Replace the output with an Aseprite export when the real art is ready.
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { TEMPLATE_KEYS } from '../src/config/render.ts';

const SIZE = 24;
const FRAMES = 4;
const FRAME_MS = 120;
const OUT = 'public/assets/sprites';

type Key = 'o' | 'b' | 's' | 'h' | 'a' | 'e' | '.';
const SLOT: Record<Exclude<Key, '.'>, number> = { o: 0, b: 1, s: 2, h: 3, a: 4, e: 5 };

/** One 24 x 24 frame of a big cat facing right; `phase` 0-3 moves the legs. */
function drawFrame(phase: number): Key[][] {
  const grid: Key[][] = Array.from({ length: SIZE }, () => Array<Key>(SIZE).fill('.'));
  const set = (x: number, y: number, k: Key) => {
    if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) grid[y]![x] = k;
  };
  const fill = (x0: number, y0: number, x1: number, y1: number, k: Key) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, k);
  };
  const bob = phase % 2; // body dips a pixel on passing frames

  fill(5, 12 + bob, 18, 17 + bob, 'b'); // body
  fill(16, 8 + bob, 21, 13 + bob, 'b'); // head
  fill(22, 11 + bob, 22, 12 + bob, 'b'); // muzzle
  set(17, 7 + bob, 'b'); // ears
  set(20, 7 + bob, 'b');
  for (const [x, y] of [
    [4, 12],
    [3, 11],
    [2, 10],
    [2, 9],
    [3, 8],
  ] as const)
    set(x, y + bob, 'b'); // tail

  // Legs: two pairs swinging in opposite directions; the forward leg lifts.
  const swing = [0, 1, 0, -1][phase]!;
  const legs = [
    { x: 6, dx: swing },
    { x: 9, dx: -swing },
    { x: 14, dx: -swing },
    { x: 17, dx: swing },
  ];
  for (const { x, dx } of legs) fill(x + dx, 18 + bob, x + dx + 1, dx > 0 ? 21 : 22, 'b');

  // Shading: belly in shadow, back and head-top lit, stripes or spots, an eye.
  fill(6, 16 + bob, 17, 17 + bob, 's');
  fill(6, 12 + bob, 15, 12 + bob, 'h');
  fill(17, 8 + bob, 20, 8 + bob, 'h');
  for (const x of [8, 11, 14]) fill(x, 13 + bob, x, 15 + bob, 'a');
  set(18, 9 + bob, 'a');
  set(20, 10 + bob, 'e');

  // Outline every empty pixel that touches the cat.
  const filled = (x: number, y: number) =>
    grid[y]?.[x] !== undefined && grid[y][x] !== '.' && grid[y][x] !== 'o';
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (
        grid[y]![x] === '.' &&
        (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))
      ) {
        grid[y]![x] = 'o';
      }
    }
  }
  return grid;
}

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const width = SIZE * FRAMES;
const pixels = Buffer.alloc(width * SIZE * 4);
for (let f = 0; f < FRAMES; f++) {
  drawFrame(f).forEach((row, y) =>
    row.forEach((k, x) => {
      if (k === '.') return;
      const [r, g, b] = hex(TEMPLATE_KEYS[SLOT[k]]!);
      pixels.set([r!, g!, b!, 255], (y * width + f * SIZE + x) * 4);
    }),
  );
}

mkdirSync(OUT, { recursive: true });
await sharp(pixels, { raw: { width, height: SIZE, channels: 4 } })
  .png()
  .toFile(`${OUT}/big-cat.png`);
const frames = Object.fromEntries(
  Array.from({ length: FRAMES }, (_, f) => [
    `big-cat ${f}.aseprite`,
    { frame: { x: f * SIZE, y: 0, w: SIZE, h: SIZE }, duration: FRAME_MS },
  ]),
);
const meta = {
  app: 'scripts/drawSampleSheet.ts',
  image: 'big-cat.png',
  format: 'RGBA8888',
  size: { w: width, h: SIZE },
  frameTags: [{ name: 'walk', from: 0, to: FRAMES - 1, direction: 'forward' }],
};
writeFileSync(`${OUT}/big-cat.json`, `${JSON.stringify({ frames, meta }, null, 2)}\n`);
console.log(`wrote ${OUT}/big-cat.png (${width}x${SIZE}) and big-cat.json`);
