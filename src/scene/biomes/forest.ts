import { BIOMES } from '@/config/biomes';
import { LAYERS } from '@/config/render';
import { darken, lighten, mix } from '../colour';
import { seededRandom } from '../random';
import { pine, rect, ridge, speckle } from './paint';
import type { BiomeArt, Painter } from './types';

const { skyTop, skyBottom, ground, accent } = BIOMES[2].palette;

const treeline: Painter = (ctx, width, height) => {
  const random = seededRandom('forest/far');
  const far = mix(skyBottom, '#306082', 0.55);
  ridge(
    ctx,
    far,
    height - 20,
    [
      [4, 4],
      [9, 2],
    ],
    random,
  );
  for (let x = 3; x < width; x += 7 + Math.floor(random() * 6)) {
    pine(ctx, far, far, x, height - 15, 22 + Math.floor(random() * 26));
  }
};

const trees: Painter = (ctx, width, height) => {
  const random = seededRandom('forest/mid');
  const leaf = darken(ground, 0.25);
  for (let x = 6; x < width; x += 18 + Math.floor(random() * 22)) {
    const h = 60 + Math.floor(random() * 40);
    rect(ctx, darken(accent, 0.2), x - 2, height - h + 20, 5, h - 20);
    rect(ctx, leaf, x - 11, height - h, 23, 26);
    rect(ctx, lighten(leaf, 0.1), x - 8, height - h - 4, 16, 6);
    rect(ctx, darken(leaf, 0.2), x - 11, height - h + 22, 23, 4);
  }
  ridge(ctx, darken(ground, 0.1), height - 8, [[6, 2]], random);
};

const floor: Painter = (ctx, width, height) => {
  const random = seededRandom('forest/ground');
  rect(ctx, darken(ground, 0.15), 0, 0, width, height);
  rect(ctx, ground, 0, 0, width, 3);
  rect(ctx, mix(accent, ground, 0.4), 0, 6, width, 8); // leaf-litter path
  speckle(ctx, accent, 6, { x: 0, y: 6, w: width, h: 8 }, random);
  speckle(ctx, '#d9a066', 3, { x: 0, y: 6, w: width, h: 8 }, random);
  speckle(ctx, darken(ground, 0.4), 10, { x: 0, y: 15, w: width, h: height - 15 }, random);
};

const mushroom: Painter = (ctx, width, height) => {
  rect(ctx, '#eec39a', Math.floor(width / 2) - 1, 3, 3, height - 3);
  rect(ctx, '#ac3232', 0, 1, width, 3);
  rect(ctx, '#ac3232', 1, 0, width - 2, 1);
  rect(ctx, '#ffffff', 2, 1, 1, 1);
  rect(ctx, '#ffffff', width - 3, 2, 1, 1);
};

const stump: Painter = (ctx, width, height) => {
  rect(ctx, darken(accent, 0.1), 0, 2, width, height - 2);
  rect(ctx, '#d9a066', 1, 0, width - 2, 3);
  rect(ctx, darken(accent, 0.35), 3, 4, 1, height - 5);
};

const fern: Painter = (ctx, width, height) => {
  const colour = lighten(ground, 0.15);
  for (let i = 0; i < 4; i++) rect(ctx, colour, i * 2, height - 2 - i * 2, width - i * 4, 1);
  rect(ctx, colour, Math.floor(width / 2), 0, 1, height);
};

export const forest: BiomeArt = {
  id: 'forest',
  sky: [skyTop, skyBottom],
  layers: [
    { ...LAYERS.far, source: treeline },
    { ...LAYERS.mid, source: trees },
    { ...LAYERS.ground, source: floor },
  ],
  props: [
    { width: 7, height: 7, minGap: 60, maxGap: 150, source: mushroom },
    { width: 12, height: 8, minGap: 110, maxGap: 220, source: stump },
    { width: 13, height: 9, minGap: 30, maxGap: 80, source: fern },
  ],
};
