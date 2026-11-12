import { BIOMES } from '@/config/biomes';
import { LAYERS } from '@/config/render';
import { darken, lighten, mix } from '../colour';
import { seededRandom } from '../random';
import { rect, speckle } from './paint';
import type { BiomeArt, Painter } from './types';

const { skyTop, skyBottom, ground, accent } = BIOMES[0].palette;
const WALL = ['#e8c39e', '#d9a066', '#cbdbfc'] as const;

const skyline: Painter = (ctx, width, height) => {
  const random = seededRandom('town/far');
  const colour = mix(skyBottom, '#5b6ee1', 0.35);
  for (let x = 0; x < width;) {
    const w = 12 + Math.floor(random() * 18);
    const h = 20 + Math.floor(random() * 45);
    rect(ctx, colour, x, height - h, w, h);
    if (random() < 0.3) rect(ctx, colour, x + Math.floor(w / 2) - 1, height - h - 6, 2, 6);
    x += w + Math.floor(random() * 4);
  }
};

const houses: Painter = (ctx, width, height) => {
  const random = seededRandom('town/mid');
  for (let x = 4; x < width - 8;) {
    const w = 28 + Math.floor(random() * 20);
    const h = 26 + Math.floor(random() * 22);
    const wall = WALL[Math.floor(random() * WALL.length)]!;
    const top = height - h;
    rect(ctx, darken(wall, 0.25), x - 1, top - 1, w + 2, h + 1);
    rect(ctx, wall, x, top, w, h);
    // Stepped roof.
    for (let row = 0; row < 8; row++) {
      rect(
        ctx,
        row % 3 === 2 ? darken(accent, 0.2) : accent,
        x - 2 + row,
        top - row - 1,
        w + 4 - row * 2,
        1,
      );
    }
    for (let wx = x + 4; wx < x + w - 6; wx += 10) {
      rect(ctx, '#3f3f74', wx, top + 6, 5, 6);
      rect(ctx, '#cbdbfc', wx + 1, top + 7, 2, 2);
    }
    rect(ctx, '#663931', x + Math.floor(w / 2) - 3, height - 11, 6, 11);
    x += w + 8 + Math.floor(random() * 14);
  }
  rect(ctx, darken(ground, 0.15), 0, height - 2, width, 2);
};

const cobbles: Painter = (ctx, width, height) => {
  const random = seededRandom('town/ground');
  rect(ctx, '#847e87', 0, 0, width, 3); // kerb
  rect(ctx, lighten(ground, 0.1), 0, 3, width, height - 3);
  for (let y = 5; y < height; y += 6) {
    const offset = (y / 6) % 2 === 0 ? 0 : 4;
    for (let x = offset; x < width + 8; x += 8) rect(ctx, darken(ground, 0.18), x, y, 1, 5);
    rect(ctx, darken(ground, 0.18), 0, y - 1, width, 1);
  }
  speckle(ctx, darken(ground, 0.3), 6, { x: 0, y: 4, w: width, h: height - 4 }, random);
};

const lamp: Painter = (ctx, width, height) => {
  rect(ctx, '#222034', Math.floor(width / 2) - 1, 4, 2, height - 4);
  rect(ctx, '#222034', 0, height - 2, width, 2);
  rect(ctx, '#222034', 0, 0, width, 5);
  rect(ctx, '#fbf236', 1, 1, width - 2, 3);
};

const flowerBox: Painter = (ctx, width, height) => {
  const random = seededRandom('town/flowers');
  rect(ctx, '#8f563b', 0, height - 5, width, 5);
  rect(ctx, '#4b692f', 1, height - 8, width - 2, 3);
  speckle(ctx, accent, 5, { x: 1, y: height - 9, w: width - 2, h: 3 }, random);
};

export const town: BiomeArt = {
  id: 'town',
  sky: [skyTop, skyBottom],
  layers: [
    { ...LAYERS.far, source: skyline },
    { ...LAYERS.mid, source: houses },
    { ...LAYERS.ground, source: cobbles },
  ],
  props: [
    { width: 6, height: 34, minGap: 70, maxGap: 140, source: lamp },
    { width: 14, height: 10, minGap: 50, maxGap: 120, source: flowerBox },
  ],
};
