// Art for the border between two biomes, keyed "from>to". Each entry may give
// a groundTile (drawn along the walk across the blended segment, instead of
// the two grounds fading) and a gateway (a landmark standing at the segment's
// middle, where the title card shows). A pair with no entry, or a missing
// piece, falls back to the plain blend. Add a border by adding an entry.
import type { BiomeId } from '@/config/biomes';
import { paletteOf } from '@/config/biomes';
import { darken, lighten, mix } from '../colour';
import { rect } from '../biomes/paint';
import type { Painter } from '../biomes/types';

export type BorderKey = `${BiomeId}>${BiomeId}`;

export interface BorderPiece {
  readonly width: number;
  readonly height: number;
  readonly source: Painter;
}

export interface BorderArt {
  /** Tiles along the ground layer's rows across the whole segment. */
  readonly groundTile?: BorderPiece;
  /** Stands on the walk line at the segment's middle. */
  readonly gateway?: BorderPiece;
}

export const borderKey = (from: BiomeId, to: BiomeId): BorderKey => `${from}>${to}`;

// Colours come from the biome palettes (config/biomes.ts), so retuning a biome retunes its border.
const town = paletteOf('town');
const grassland = paletteOf('grassland');
const dirt = paletteOf('rocky-hills').accent;
const stone = paletteOf('snowy-peak').accent;
const wood = paletteOf('forest').accent;

/** Cobbles giving way to a dirt path: town's edge. */
const cobblesToDirt: Painter = (ctx, width, height) => {
  rect(ctx, mix(town.ground, grassland.ground, 0.5), 0, 0, width, height);
  rect(ctx, mix(town.ground, dirt, 0.4), 0, 6, width, 8);
  for (let x = 1; x < width; x += 6) rect(ctx, darken(town.ground, 0.25), x, 7, 4, 3);
};

/** A stone arch over the path out of town. */
const townGate: Painter = (ctx, width, height) => {
  rect(ctx, stone, 0, 4, 5, height - 4);
  rect(ctx, stone, width - 5, 4, 5, height - 4);
  rect(ctx, stone, 0, 0, width, 5);
  rect(ctx, darken(stone, 0.3), 0, 5, width, 1);
  rect(ctx, town.accent, Math.floor(width / 2) - 3, 1, 6, 3); // banner
};

/** A wooden signpost at the forest's edge. */
const signpost: Painter = (ctx, width, height) => {
  rect(ctx, darken(wood, 0.2), Math.floor(width / 2) - 1, 3, 2, height - 3);
  rect(ctx, wood, 0, 2, width, 4);
  rect(ctx, lighten(wood, 0.3), 1, 3, width - 3, 1);
};

/** A rope bridge post: the hills dropping into the rainforest. */
const ropePost: Painter = (ctx, width, height) => {
  const post = darken(wood, 0.3);
  rect(ctx, post, 0, 2, 3, height - 2);
  rect(ctx, post, width - 3, 2, 3, height - 2);
  for (let x = 3; x < width - 3; x += 3) rect(ctx, dirt, x, 5 + (x % 2), 2, 1);
};

export const BORDERS: Readonly<Partial<Record<BorderKey, BorderArt>>> = {
  'town>grassland': {
    groundTile: { width: 32, height: 40, source: cobblesToDirt },
    gateway: { width: 22, height: 28, source: townGate },
  },
  'grassland>forest': { gateway: { width: 12, height: 18, source: signpost } },
  'rocky-hills>rainforest': { gateway: { width: 18, height: 16, source: ropePost } },
};
