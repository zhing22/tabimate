import { paletteOf } from '@/config/biomes';
import { LAYERS } from '@/config/render';
import { darken, lighten, mix } from '../colour';
import { seededRandom } from '../random';
import { rect, ridge, speckle } from './paint';
import type { BiomeArt, Painter } from './types';

const { skyTop, skyBottom, ground, accent } = paletteOf('rocky-hills');

const crags: Painter = (ctx, _width, height) => {
  const random = seededRandom('rocky-hills/far');
  // Sharp, uneven peaks: high, fast waves on a low base.
  ridge(
    ctx,
    mix(skyBottom, '#6a7a8f', 0.5),
    height - 50,
    [
      [3, 16],
      [8, 9],
      [17, 4],
    ],
    random,
  );
  ridge(ctx, mix(skyBottom, '#6a7a8f', 0.65), height - 22, [[5, 7]], random);
};

const cliffs: Painter = (ctx, width, height) => {
  const random = seededRandom('rocky-hills/mid');
  ridge(
    ctx,
    darken(ground, 0.1),
    height - 40,
    [
      [2, 10],
      [6, 5],
    ],
    random,
  );
  // Ledges: short light strips where the rock catches the sun.
  for (let x = 8; x < width; x += 20 + Math.floor(random() * 24)) {
    const y = height - 34 + Math.floor(random() * 16);
    rect(ctx, lighten(ground, 0.2), x, y, 10 + Math.floor(random() * 8), 2);
    rect(ctx, darken(ground, 0.3), x + 2, y + 2, 8, 1);
  }
  speckle(ctx, darken(ground, 0.35), 40, { x: 0, y: height - 30, w: width, h: 30 }, random);
};

const trail: Painter = (ctx, width, height) => {
  const random = seededRandom('rocky-hills/ground');
  rect(ctx, darken(ground, 0.2), 0, 0, width, height);
  rect(ctx, ground, 0, 0, width, 3);
  rect(ctx, mix(accent, ground, 0.5), 0, 6, width, 8); // dusty path
  speckle(ctx, lighten(ground, 0.3), 6, { x: 0, y: 6, w: width, h: 8 }, random);
  speckle(ctx, darken(ground, 0.45), 10, { x: 0, y: 15, w: width, h: height - 15 }, random);
};

const boulder: Painter = (ctx, width, height) => {
  rect(ctx, darken(ground, 0.15), 1, 1, width - 2, height - 1);
  rect(ctx, darken(ground, 0.15), 0, 3, width, height - 3);
  rect(ctx, lighten(ground, 0.25), 2, 1, width - 5, 2);
  rect(ctx, darken(ground, 0.4), 1, height - 1, width - 2, 1);
};

const scrub: Painter = (ctx, width, height) => {
  const leaf = mix('#6abe30', ground, 0.4);
  rect(ctx, leaf, 1, 2, width - 2, height - 2);
  rect(ctx, darken(leaf, 0.25), 0, height - 2, width, 2);
  rect(ctx, lighten(leaf, 0.2), 2, 0, width - 5, 2);
};

const cairn: Painter = (ctx, width, height) => {
  const stone = lighten(ground, 0.1);
  rect(ctx, stone, 0, height - 3, width, 3);
  rect(ctx, darken(stone, 0.15), 1, height - 6, width - 2, 3);
  rect(ctx, stone, 2, height - 9, width - 4, 3);
  rect(ctx, darken(stone, 0.3), 0, height - 1, width, 1);
};

export const rockyHills: BiomeArt = {
  id: 'rocky-hills',
  sky: [skyTop, skyBottom],
  layers: [
    { ...LAYERS.far, source: crags },
    { ...LAYERS.mid, source: cliffs },
    { ...LAYERS.ground, source: trail },
  ],
  props: [
    { width: 14, height: 9, minGap: 70, maxGap: 160, source: boulder },
    { width: 9, height: 6, minGap: 30, maxGap: 90, source: scrub },
    { width: 8, height: 9, minGap: 140, maxGap: 260, source: cairn },
  ],
};
