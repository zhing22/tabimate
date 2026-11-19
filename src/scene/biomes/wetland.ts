import { paletteOf } from '@/config/biomes';
import { LAYERS } from '@/config/render';
import { darken, lighten, mix } from '../colour';
import { seededRandom } from '../random';
import { pine, rect, ridge, speckle } from './paint';
import type { BiomeArt, Painter } from './types';

const { skyTop, skyBottom, ground, accent } = paletteOf('wetland');

const marshHorizon: Painter = (ctx, width, height) => {
  const random = seededRandom('wetland/far');
  const far = mix(skyBottom, ground, 0.45);
  ridge(ctx, far, height - 30, [[4, 3]], random);
  for (let x = 6; x < width; x += 12 + Math.floor(random() * 20)) {
    pine(ctx, far, far, x, height - 26, 12 + Math.floor(random() * 10));
  }
  // Open water in front of the far trees, catching the sky.
  const water = mix(accent, skyBottom, 0.3);
  rect(ctx, water, 0, height - 20, width, 20);
  speckle(ctx, lighten(water, 0.5), 30, { x: 0, y: height - 20, w: width, h: 20 }, random);
};

const reedbeds: Painter = (ctx, width, height) => {
  const random = seededRandom('wetland/mid');
  const reed = mix(ground, '#cbdbfc', 0.15);
  // Clumps of reeds with open water between them.
  rect(ctx, mix(accent, ground, 0.45), 0, height - 10, width, 10);
  for (let clump = 0; clump < width; clump += 24 + Math.floor(random() * 20)) {
    const span = 10 + Math.floor(random() * 14);
    for (let x = clump; x < clump + span; x += 1 + Math.floor(random() * 2)) {
      const h = 22 + Math.floor(random() * 30);
      rect(ctx, random() < 0.5 ? reed : darken(reed, 0.2), x, height - h, 1, h);
      if (random() < 0.25) rect(ctx, '#8f563b', x, height - h - 3, 1, 4); // cattail head
    }
  }
  rect(ctx, darken(ground, 0.15), 0, height - 4, width, 4);
};

const mudbank: Painter = (ctx, width, height) => {
  const random = seededRandom('wetland/ground');
  rect(ctx, darken(ground, 0.35), 0, 0, width, height);
  rect(ctx, ground, 0, 0, width, 3);
  rect(ctx, mix('#8f563b', ground, 0.5), 0, 6, width, 8); // boardwalk-brown path
  rect(ctx, darken('#8f563b', 0.3), 0, 9, width, 1);
  speckle(ctx, mix(accent, ground, 0.4), 8, { x: 0, y: 15, w: width, h: height - 15 }, random);
};

const lilyPad: Painter = (ctx, width, height) => {
  rect(ctx, mix(accent, ground, 0.6), 0, height - 2, width, 2); // water
  rect(ctx, lighten(ground, 0.2), 1, height - 3, width - 2, 2);
  rect(ctx, '#ffffff', Math.floor(width / 2), 0, 2, 2);
  rect(ctx, '#d77bba', Math.floor(width / 2) - 1, 1, 1, 1);
};

const cattails: Painter = (ctx, width, height) => {
  const stem = lighten(ground, 0.1);
  for (let i = 0; i < width; i += 3) rect(ctx, stem, i, 3, 1, height - 3);
  for (let i = 0; i < width; i += 3) rect(ctx, '#8f563b', i, 0, 1, 4);
};

const stump: Painter = (ctx, width, height) => {
  const wood = mix('#8f563b', ground, 0.3);
  rect(ctx, wood, 1, 1, width - 2, height - 1);
  rect(ctx, lighten(wood, 0.25), 2, 0, width - 4, 2);
  rect(ctx, darken(wood, 0.3), 3, 3, 1, height - 4);
};

export const wetland: BiomeArt = {
  id: 'wetland',
  sky: [skyTop, skyBottom],
  layers: [
    { ...LAYERS.far, source: marshHorizon },
    { ...LAYERS.mid, source: reedbeds },
    { ...LAYERS.ground, source: mudbank },
  ],
  props: [
    { width: 9, height: 5, minGap: 40, maxGap: 110, source: lilyPad },
    { width: 8, height: 12, minGap: 30, maxGap: 90, source: cattails },
    { width: 9, height: 7, minGap: 130, maxGap: 250, source: stump },
  ],
};
