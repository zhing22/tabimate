import { paletteOf } from '@/config/biomes';
import { LAYERS } from '@/config/render';
import { darken, lighten, mix } from '../colour';
import { seededRandom } from '../random';
import { rect, ridge, speckle } from './paint';
import type { BiomeArt, Painter } from './types';

const { skyTop, skyBottom, ground, accent } = paletteOf('rainforest');

const canopy: Painter = (ctx, width, height) => {
  const random = seededRandom('rainforest/far');
  const far = mix(skyBottom, ground, 0.55);
  // A lumpy wall of treetops, with a few emergent crowns standing above it.
  ridge(
    ctx,
    far,
    height - 45,
    [
      [9, 6],
      [23, 3],
    ],
    random,
  );
  for (let x = 10; x < width; x += 40 + Math.floor(random() * 50)) {
    rect(ctx, far, x - 9, height - 66, 18, 12);
    rect(ctx, far, x - 1, height - 54, 2, 10);
  }
};

const jungle: Painter = (ctx, width, height) => {
  const random = seededRandom('rainforest/mid');
  const leaf = darken(ground, 0.05);
  // Buttressed trunks under one continuous, layered canopy: crowns are wide and
  // overlap, so the forest reads as a mass rather than separate trees.
  for (let x = 4; x < width; x += 22 + Math.floor(random() * 18)) {
    const trunk = darken('#8f563b', 0.2);
    rect(ctx, trunk, x - 2, height - 70, 4, 60);
    rect(ctx, trunk, x - 5, height - 16, 10, 6); // buttress roots
  }
  for (let x = 0; x < width; x += 10 + Math.floor(random() * 10)) {
    const top = height - 100 + Math.floor(random() * 22);
    const shade = random() < 0.5 ? leaf : lighten(leaf, 0.12);
    rect(ctx, shade, x - 14, top, 30, 26);
    rect(ctx, lighten(shade, 0.15), x - 10, top - 3, 22, 4);
  }
  for (let x = 3; x < width; x += 6 + Math.floor(random() * 9)) {
    // Vines and hanging leaves below the canopy.
    rect(ctx, mix(leaf, '#99e550', 0.35), x, height - 76, 1, 10 + Math.floor(random() * 30));
  }
  ridge(ctx, darken(ground, 0.2), height - 10, [[8, 3]], random);
};

const floor: Painter = (ctx, width, height) => {
  const random = seededRandom('rainforest/ground');
  rect(ctx, darken(ground, 0.3), 0, 0, width, height);
  rect(ctx, ground, 0, 0, width, 3);
  rect(ctx, mix('#663931', ground, 0.4), 0, 6, width, 8); // muddy path
  speckle(ctx, lighten(ground, 0.2), 8, { x: 0, y: 0, w: width, h: 6 }, random);
  speckle(ctx, darken(ground, 0.5), 12, { x: 0, y: 15, w: width, h: height - 15 }, random);
};

const bigLeaf: Painter = (ctx, width, height) => {
  const leaf = lighten(ground, 0.15);
  rect(ctx, leaf, 0, 2, width, height - 5);
  rect(ctx, lighten(leaf, 0.2), 2, 0, width - 4, 3);
  rect(ctx, darken(leaf, 0.3), Math.floor(width / 2), 2, 1, height - 2); // midrib
};

const flower: Painter = (ctx, width, height) => {
  rect(ctx, darken(ground, 0.1), Math.floor(width / 2), 3, 1, height - 3);
  rect(ctx, accent, 0, 0, width, 3);
  rect(ctx, '#fbf236', Math.floor(width / 2) - 1, 1, 2, 1);
};

const roots: Painter = (ctx, width, height) => {
  const wood = darken('#8f563b', 0.1);
  rect(ctx, wood, 2, 0, width - 4, height);
  rect(ctx, wood, 0, height - 3, width, 3);
  rect(ctx, darken(wood, 0.3), 4, 2, 1, height - 3);
};

export const rainforest: BiomeArt = {
  id: 'rainforest',
  sky: [skyTop, skyBottom],
  layers: [
    { ...LAYERS.far, source: canopy },
    { ...LAYERS.mid, source: jungle },
    { ...LAYERS.ground, source: floor },
  ],
  props: [
    { width: 11, height: 12, minGap: 30, maxGap: 80, source: bigLeaf },
    { width: 5, height: 8, minGap: 50, maxGap: 130, source: flower },
    { width: 10, height: 10, minGap: 120, maxGap: 240, source: roots },
  ],
};
