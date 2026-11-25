import type { HexColour } from './colour';

export interface BiomePalette {
  readonly skyTop: HexColour;
  readonly skyBottom: HexColour;
  readonly ground: HexColour;
  readonly accent: HexColour;
}

/**
 * How a framed scene's border looks (wide windows, SCENE_FRAME in
 * config/render.ts): a 9-slice per style in ui/styles/sceneFrame.css.
 */
export type SceneFrameId = 'timber' | 'stone' | 'vines' | 'ice';

export interface BiomeDef {
  readonly id: string;
  readonly name: string;
  /** Shown beside the name in share text. */
  readonly emoji: string;
  /** Total score needed to enter this biome. The first biome must be 0. */
  readonly minScore: number;
  readonly palette: BiomePalette;
  /** The frame drawn round the scene on very wide windows. */
  readonly frame: SceneFrameId;
}

/**
 * Journey order, and the total score that enters each biome. A full day is 7
 * prompts, at most 100 each (700). Points per answer: LC 10, NT 25, VU 50,
 * EN 85, CR 100. The thresholds read as "a day of answers at this level":
 *
 *   Grassland    50   about one VU, or a few easy answers: everyone leaves town
 *   Forest      125   2-3 VU answers; also the old 3-prompt threshold, kept so
 *                     released days still reach the same place
 *   Rocky hills 200   all NT (175) falls just short; a mix with a couple of VUs
 *   Rainforest  300   about six VUs: a good day
 *   Wetland     420   VUs with two or three ENs: a strong day
 *   Snowy peak  560   mostly ENs and some CRs (all EN is 595): an expert day
 *
 * The gaps grow (50, 75, 75, 100, 120, 140) so the early biomes come quickly and
 * the last ones are earned. Old 3-prompt days (300 max) can reach Rainforest.
 * Add a biome by appending an entry (and its art in scene/biomes/).
 */
export const BIOMES = [
  {
    id: 'town',
    name: 'Town',
    emoji: '🏘️',
    minScore: 0,
    frame: 'timber',
    palette: { skyTop: '#8fd3ff', skyBottom: '#e8f6ff', ground: '#b08060', accent: '#d95763' },
  },
  {
    id: 'grassland',
    name: 'Grassland',
    emoji: '🌾',
    minScore: 50,
    frame: 'timber',
    palette: { skyTop: '#6cc4f5', skyBottom: '#fff4c9', ground: '#6abe30', accent: '#fbf236' },
  },
  {
    id: 'forest',
    name: 'Forest',
    emoji: '🌲',
    minScore: 125,
    frame: 'timber',
    palette: { skyTop: '#5fa8c8', skyBottom: '#cfe8d0', ground: '#37946e', accent: '#8f563b' },
  },
  {
    id: 'rocky-hills',
    name: 'Rocky hills',
    emoji: '⛰️',
    minScore: 200,
    frame: 'stone',
    palette: { skyTop: '#7fb4d8', skyBottom: '#f2e3c6', ground: '#9a8466', accent: '#d9a066' },
  },
  {
    id: 'rainforest',
    name: 'Rainforest',
    emoji: '🌴',
    minScore: 300,
    frame: 'vines',
    palette: { skyTop: '#4f9a8a', skyBottom: '#d8f0c8', ground: '#2f6e3a', accent: '#df7126' },
  },
  {
    id: 'wetland',
    name: 'Wetland',
    emoji: '🌿',
    minScore: 420,
    frame: 'vines',
    palette: { skyTop: '#9ab8c8', skyBottom: '#eef2e0', ground: '#5a7a4a', accent: '#639bff' },
  },
  {
    id: 'snowy-peak',
    name: 'Snowy peak',
    emoji: '🏔️',
    minScore: 560,
    frame: 'ice',
    palette: { skyTop: '#5b7fb8', skyBottom: '#e8f0ff', ground: '#eef4fb', accent: '#8a9bb8' },
  },
] as const satisfies readonly BiomeDef[];

export type BiomeId = (typeof BIOMES)[number]['id'];

/** A biome's palette by id, for its art module (so art doesn't depend on list order). */
export const paletteOf = (id: BiomeId): BiomePalette => BIOMES.find((b) => b.id === id)!.palette;
