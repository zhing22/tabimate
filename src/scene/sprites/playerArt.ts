// The traveller, 16 x 24 native px, drawn in code until the Step 8b sprite.
// Faces right. One character per pixel; '.' is transparent.
import { PLAYER_SIZE } from '@/config/render';
import type { PortraitImage } from '@/core/portrait';
import { makeCanvas, portraitFrom } from './canvasArt';

export const PLAYER_COLOURS: Readonly<Record<string, string>> = {
  o: '#222034', // outline
  h: '#8f563b', // hat
  b: '#d9a066', // hat band
  s: '#eec39a', // skin
  e: '#222034', // eye
  c: '#5b6ee1', // coat
  d: '#3f3f74', // coat shadow, trousers
  p: '#df7126', // backpack
  k: '#663931', // boots
};

// prettier-ignore
export const PLAYER_PIXELS: readonly string[] = [
  '.....oooooo.....',
  '....ohhhhhho....',
  '..oooooooooooo..',
  '..obbbbbbbbbbo..',
  '..oooooooooooo..',
  '....osssssso....',
  '....ossssseso...',
  '....osssssso....',
  '.....oooooo.....',
  '..ooooccccco....',
  '.oppposcccco....',
  '.oppposccccso...',
  '.oppposddccco...',
  '.oppposcccco....',
  '.oppposcccco....',
  '..ooooddddddo...',
  '.....occcccco...',
  '.....oooooooo...',
  '.....oddodddo...',
  '.....oddoddo....',
  '.....oddoddo....',
  '.....okkokko....',
  '.....okkkkkko...',
  '.....oooooooo...',
];

/** The traveller as a still for the UI (the loading card); null without a 2D canvas. */
export function playerStill(): PortraitImage | null {
  try {
    const { canvas, ctx } = makeCanvas(PLAYER_SIZE.width, PLAYER_SIZE.height);
    paintPlayer(ctx);
    return portraitFrom(canvas, { x: 0, y: 0, w: canvas.width, h: canvas.height }, false);
  } catch {
    return null;
  }
}

export function paintPlayer(ctx: CanvasRenderingContext2D): void {
  PLAYER_PIXELS.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const colour = PLAYER_COLOURS[row[x]!];
      if (!colour) continue;
      ctx.fillStyle = colour;
      ctx.fillRect(x, y, 1, 1);
    }
  });
}

/** From this row down are the legs; the walk frames swap them. */
const LEGS_FROM = 18;

// prettier-ignore
const STRIDE_A: readonly string[] = [
  '.....oddodddo...',
  '....oddo.oddo...',
  '...oddo...oddo..',
  '...okko...okkoo.',
  '..okkko...okkkko',
  '..ooooo...oooooo',
];

// prettier-ignore
const STRIDE_B: readonly string[] = [
  '.....oddodddo...',
  '.....oddooddo...',
  '....oddo.oddo...',
  '....okko.okko...',
  '...okkko.okkko..',
  '...ooooo.ooooo..',
];

const withLegs = (legs: readonly string[]) => [...PLAYER_PIXELS.slice(0, LEGS_FROM), ...legs];

/**
 * The traveller's walk: standing, a long stride, standing, a short one. The
 * loading kit (scripts/build-loading-kit.ts) plays them before any JS runs.
 */
export const PLAYER_WALK_FRAMES: readonly (readonly string[])[] = [
  PLAYER_PIXELS,
  withLegs(STRIDE_A),
  PLAYER_PIXELS,
  withLegs(STRIDE_B),
];
