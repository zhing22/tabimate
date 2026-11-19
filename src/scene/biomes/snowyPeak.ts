import { paletteOf } from '@/config/biomes';
import { LAYERS } from '@/config/render';
import { darken, lighten, mix } from '../colour';
import { seededRandom } from '../random';
import { pine, rect, ridge, speckle } from './paint';
import type { BiomeArt, Painter } from './types';

const { skyTop, skyBottom, ground, accent } = paletteOf('snowy-peak');

const peaks: Painter = (ctx, width, height) => {
  const random = seededRandom('snowy-peak/far');
  const rock = mix(skyBottom, accent, 0.7);
  ridge(
    ctx,
    rock,
    height - 55,
    [
      [2, 22],
      [5, 9],
      [13, 3],
    ],
    random,
  );
  // Snow caps: wherever the ridge is high, the top few pixels turn white.
  const image = ctx.getImageData(0, 0, width, height);
  for (let x = 0; x < width; x++) {
    let top = 0;
    while (top < height && image.data[(top * width + x) * 4 + 3] === 0) top++;
    if (top < height - 62) rect(ctx, ground, x, top, 1, 4 + Math.floor((height - 62 - top) / 3));
  }
};

const snowPines: Painter = (ctx, width, height) => {
  const random = seededRandom('snowy-peak/mid');
  const needle = mix('#37946e', accent, 0.45);
  ridge(ctx, lighten(accent, 0.45), height - 18, [[3, 6]], random);
  for (let x = 5; x < width; x += 13 + Math.floor(random() * 18)) {
    const h = 26 + Math.floor(random() * 26);
    pine(ctx, needle, darken(accent, 0.4), x, height - 8, h);
    rect(ctx, ground, x - 1, height - 8 - h, 3, 2); // snow on the tip
  }
};

const snowfield: Painter = (ctx, width, height) => {
  const random = seededRandom('snowy-peak/ground');
  rect(ctx, darken(ground, 0.05), 0, 0, width, height);
  rect(ctx, ground, 0, 0, width, 3);
  rect(ctx, mix(accent, ground, 0.65), 0, 6, width, 8); // trodden path
  speckle(ctx, '#ffffff', 10, { x: 0, y: 0, w: width, h: height }, random);
  speckle(ctx, mix(accent, ground, 0.5), 8, { x: 0, y: 15, w: width, h: height - 15 }, random);
};

const snowRock: Painter = (ctx, width, height) => {
  rect(ctx, darken(accent, 0.15), 0, 2, width, height - 2);
  rect(ctx, ground, 1, 0, width - 2, 3);
  rect(ctx, darken(accent, 0.4), 1, height - 1, width - 2, 1);
};

const smallPine: Painter = (ctx, width, height) => {
  pine(
    ctx,
    mix('#37946e', accent, 0.45),
    darken(accent, 0.4),
    Math.floor(width / 2),
    height,
    height,
  );
  rect(ctx, ground, Math.floor(width / 2) - 1, 0, 3, 2);
};

const drift: Painter = (ctx, width, height) => {
  rect(ctx, lighten(ground, 0.4), 2, 0, width - 4, height);
  rect(ctx, ground, 0, 1, width, height - 1);
  rect(ctx, mix(accent, ground, 0.6), 1, height - 1, width - 2, 1);
};

export const snowyPeak: BiomeArt = {
  id: 'snowy-peak',
  sky: [skyTop, skyBottom],
  layers: [
    { ...LAYERS.far, source: peaks },
    { ...LAYERS.mid, source: snowPines },
    { ...LAYERS.ground, source: snowfield },
  ],
  props: [
    { width: 12, height: 8, minGap: 60, maxGap: 150, source: snowRock },
    { width: 9, height: 14, minGap: 50, maxGap: 140, source: smallPine },
    { width: 14, height: 4, minGap: 90, maxGap: 200, source: drift },
  ],
};
