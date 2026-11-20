// The scene's pixel grid. Everything is drawn at this native size and scaled
// up by a whole number of device pixels, so pixels stay crisp on every screen.
import type { SizeClass } from './animals';
import type { HexColour } from './colour';

/** Scene height in native pixels, on every screen. Wider screens see more world. */
export const NATIVE_HEIGHT = 180;

/**
 * Widest world view drawn (native px). The canvas buffer is this wide and never
 * resized; a very wide, short window shows sky beyond it instead.
 */
export const MAX_VISIBLE_WIDTH = 640;

/**
 * Narrowest world view (native px). A tall, narrow screen (a phone upright,
 * with the scene behind the whole page) would otherwise zoom right in; this
 * keeps the scale where the world is at least this wide.
 */
export const MIN_VISIBLE_WIDTH = 180;

/** The walk line: characters' feet rest here. */
export const GROUND_Y = 150;

/** Width of the far and mid layers; they repeat left to right. */
export const LAYER_WIDTH = 320;

export interface LayerSpec {
  readonly width: number;
  readonly height: number;
  /** Top edge, native px from the top of the scene. */
  readonly y: number;
  /** How far the layer moves per pixel the camera moves: 0 fixed, 1 with the ground. */
  readonly parallax: number;
}

/** Same horizon and walk line in every biome (Art specs: biome layers). */
export const LAYERS = {
  far: { width: LAYER_WIDTH, height: 90, y: GROUND_Y - 90, parallax: 0.2 },
  mid: { width: LAYER_WIDTH, height: 110, y: GROUND_Y - 110, parallax: 0.5 },
  ground: { width: 32, height: 40, y: GROUND_Y - 10, parallax: 1 },
} as const satisfies Record<string, LayerSpec>;

/** Props stand on the ground a little behind the walk line. */
export const PROP_BASE_Y = GROUND_Y - 3;

/**
 * The results line-up's snapshot of a biome (native px): from row `top` down to
 * `groundBelow` rows under the walk line. A high camera: it shows the treetops
 * or hills and the path, and only a strip of the empty ground below it.
 */
export const BACKDROP = { top: 78, groundBelow: 12, width: 220 } as const;

/** The snapshot's height, and where its walk line is (rows from its top). */
export const BACKDROP_HEIGHT = GROUND_Y + BACKDROP.groundBelow - BACKDROP.top;
export const BACKDROP_GROUND_Y = GROUND_Y - BACKDROP.top;

/** Where the player stands, as a share of the visible width from the left. */
export const PLAYER_SCREEN_X = 0.75;

/**
 * Path distance between one follower and the next (native px): a large (24 px)
 * animal plus a few pixels of space, so the party reads as separate animals.
 */
export const FOLLOWER_SPACING = 28;

/** Each follower steps this much later than the one in front (seconds into the walk). */
export const FOLLOWER_STEP_OFFSET_S = 0.13;

export const SIZE_PX: Readonly<Record<SizeClass, number>> = { S: 12, M: 16, L: 24 };

export const PLAYER_SIZE = { width: 16, height: 24 } as const;

/**
 * The walk after an answer: at least WALK.speed px/s, sped up so no walk takes
 * longer than maxS (a CR answer walks 800 px), and never shorter than minS.
 * With reduced motion there is no walk: the party is placed at once (a cut).
 */
export const WALK = { speed: 160, minS: 0.5, maxS: 4.5 } as const;

/** Each miss since the last hit leaves its footprints this far past the last. */
export const FOOTPRINT_STEP = 6;

/**
 * The blended stretch before each biome's start: the scenery shifts from one
 * biome to the next across it (scene/strip.ts worldStateAt).
 */
export const BIOME_BORDER = 320;

/**
 * The biome's title card, shown as the player passes the middle of its border:
 * fades in and out over totalMs, a paper card `top` px from the scene's top,
 * text at textSize with `pad` px around it.
 */
export const TITLE_CARD = {
  fadeMs: 300,
  totalMs: 2_000,
  top: 10,
  pad: 4,
  textSize: 10,
  ink: '#2b2134',
  paper: '#f6e8c8',
} as const;

/** A new follower pops in over this long. */
export const POP_IN_MS = 350;

/** Wait this long after the last resize before re-laying out the canvas. */
export const RESIZE_DEBOUNCE_MS = 150;

/**
 * Sprite sheets are drawn only in these key colours (plus transparency), in
 * slot order; each animal's palette replaces them. Pure, easy-to-pick colours
 * so artists can't hit one by accident.
 */
export const TEMPLATE_KEYS = [
  '#000000', // 0 outline
  '#ff0000', // 1 base body
  '#00ff00', // 2 shadow
  '#0000ff', // 3 highlight
  '#ffff00', // 4 accent (stripes, spots, beak, mane)
  '#ff00ff', // 5 eyes and detail
] as const satisfies readonly HexColour[];

export const PALETTE_SLOTS = 6;

/** Six colours in TEMPLATE_KEYS slot order. */
export type Palette = readonly [
  outline: HexColour,
  base: HexColour,
  shadow: HexColour,
  highlight: HexColour,
  accent: HexColour,
  eye: HexColour,
];

/** An animal's colours (animals.json): palette names from palettes.json. */
export interface AnimalArt {
  readonly palette: string;
  readonly shinyPalette?: string;
  /** Per-slot tweaks on top of the palette, e.g. { "5": "#3a7d44" } for green eyes. */
  readonly paletteOverride?: Readonly<Partial<Record<number, HexColour>>>;
}

/** Which sprites the scene draws: pixel sheets (falling back to emoji), or emoji only. */
export const SPRITE_SOURCE: 'pixel' | 'emoji' = 'pixel';

/** How long a blink shows its eyes-closed frame. */
export const BLINK_MS = 140;
