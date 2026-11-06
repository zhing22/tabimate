import type { HexColour } from './colour';

export interface BiomePalette {
  readonly skyTop: HexColour;
  readonly skyBottom: HexColour;
  readonly ground: HexColour;
  readonly accent: HexColour;
}

export interface BiomeDef {
  readonly id: string;
  readonly name: string;
  /** Total score needed to enter this biome. The first biome must be 0. */
  readonly minScore: number;
  readonly palette: BiomePalette;
}

/**
 * Journey order. Thresholds assume 3 prompts (max 300 points): Grassland needs
 * about one Vulnerable answer, Forest about two. Revisit when PROMPTS_PER_DAY
 * grows. Add a biome by appending an entry.
 */
export const BIOMES = [
  {
    id: 'town',
    name: 'Town',
    minScore: 0,
    palette: { skyTop: '#8fd3ff', skyBottom: '#e8f6ff', ground: '#b08060', accent: '#d95763' },
  },
  {
    id: 'grassland',
    name: 'Grassland',
    minScore: 50,
    palette: { skyTop: '#6cc4f5', skyBottom: '#fff4c9', ground: '#6abe30', accent: '#fbf236' },
  },
  {
    id: 'forest',
    name: 'Forest',
    minScore: 125,
    palette: { skyTop: '#5fa8c8', skyBottom: '#cfe8d0', ground: '#37946e', accent: '#8f563b' },
  },
] as const satisfies readonly BiomeDef[];

export type BiomeId = (typeof BIOMES)[number]['id'];
