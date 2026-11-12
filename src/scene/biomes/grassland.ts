import { BIOMES } from '@/config/biomes';
import { LAYERS } from '@/config/render';
import { darken, lighten, mix } from '../colour';
import { seededRandom } from '../random';
import { rect, ridge, speckle } from './paint';
import type { BiomeArt, Painter } from './types';

const { skyTop, skyBottom, ground, accent } = BIOMES[1].palette;

const mountains: Painter = (ctx, _width, height) => {
  const random = seededRandom('grassland/far');
  ridge(
    ctx,
    mix(skyBottom, '#5b6ee1', 0.4),
    height - 55,
    [
      [2, 18],
      [5, 8],
      [11, 3],
    ],
    random,
  );
  ridge(
    ctx,
    mix(skyBottom, '#5b6ee1', 0.55),
    height - 25,
    [
      [3, 8],
      [7, 4],
    ],
    random,
  );
};

const hills: Painter = (ctx, width, height) => {
  const random = seededRandom('grassland/mid');
  ridge(
    ctx,
    lighten(ground, 0.25),
    height - 45,
    [
      [2, 10],
      [5, 5],
    ],
    random,
  );
  ridge(
    ctx,
    lighten(ground, 0.1),
    height - 22,
    [
      [3, 6],
      [8, 3],
    ],
    random,
  );
  // Bushes along the nearer hill.
  for (let i = 0; i < 9; i++) {
    const x = random() * width;
    const w = 6 + Math.floor(random() * 8);
    rect(ctx, darken(ground, 0.2), x, height - 12 - Math.floor(random() * 6), w, 5);
    rect(ctx, darken(ground, 0.05), x + 1, height - 13 - Math.floor(random() * 6), w - 2, 3);
  }
};

const grass: Painter = (ctx, width, height) => {
  const random = seededRandom('grassland/ground');
  rect(ctx, ground, 0, 0, width, height);
  rect(ctx, lighten(ground, 0.2), 0, 0, width, 2);
  rect(ctx, '#c69c6d', 0, 6, width, 8); // the dirt path the party walks on
  rect(ctx, darken('#c69c6d', 0.15), 0, 13, width, 1);
  speckle(ctx, darken('#c69c6d', 0.2), 4, { x: 0, y: 7, w: width, h: 6 }, random);
  speckle(ctx, darken(ground, 0.2), 10, { x: 0, y: 16, w: width, h: height - 16 }, random);
};

const tuft: Painter = (ctx, width, height) => {
  const colour = darken(ground, 0.15);
  for (let x = 0; x < width; x += 2) rect(ctx, colour, x, (x * 3) % 5, 1, height - ((x * 3) % 5));
};

const rock: Painter = (ctx, width, height) => {
  rect(ctx, '#696a6a', 1, 2, width - 2, height - 2);
  rect(ctx, '#9badb7', 2, 1, width - 5, 3);
  rect(ctx, '#595652', 0, height - 2, width, 2);
};

const flowers: Painter = (ctx, width, height) => {
  const random = seededRandom('grassland/flowers');
  for (let x = 1; x < width; x += 3) {
    const h = 3 + Math.floor(random() * (height - 4));
    rect(ctx, darken(ground, 0.2), x, height - h, 1, h);
    rect(ctx, random() < 0.5 ? accent : '#ffffff', x - 1, height - h - 1, 3, 2);
  }
};

export const grassland: BiomeArt = {
  id: 'grassland',
  sky: [skyTop, skyBottom],
  layers: [
    { ...LAYERS.far, source: mountains },
    { ...LAYERS.mid, source: hills },
    { ...LAYERS.ground, source: grass },
  ],
  props: [
    { width: 8, height: 7, minGap: 20, maxGap: 60, source: tuft },
    { width: 12, height: 8, minGap: 90, maxGap: 200, source: rock },
    { width: 13, height: 9, minGap: 60, maxGap: 150, source: flowers },
  ],
};
