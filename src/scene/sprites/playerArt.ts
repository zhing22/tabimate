// The traveller, 16 x 24 native px, drawn in code until the Step 8b sprite.
// Faces right. One character per pixel; '.' is transparent.

const COLOURS: Readonly<Record<string, string>> = {
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

export function paintPlayer(ctx: CanvasRenderingContext2D): void {
  PLAYER_PIXELS.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const colour = COLOURS[row[x]!];
      if (!colour) continue;
      ctx.fillStyle = colour;
      ctx.fillRect(x, y, 1, 1);
    }
  });
}
