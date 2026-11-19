// The words prompt templates are made of: how each allowed trait value reads
// in a sentence ("carnivore" -> "meat"), and the option lists built from them.
// The values come from config/traits.ts; only their wording lives here.
import type { DIETS, HABITATS, CONTINENTS, SOCIAL } from '@/config/traits';
import type { AnimalFilter } from '@/core/traits';

export interface BlankOption {
  readonly value: string;
  /** How the value reads in the prompt text. */
  readonly label: string;
}

export const opts = <T extends string>(
  values: readonly T[],
  label: (v: T) => string,
): BlankOption[] => values.map((value) => ({ value, label: label(value) }));
export const fixed = (pairs: Readonly<Record<string, string>>): BlankOption[] =>
  Object.entries(pairs).map(([value, label]) => ({ value, label }));
export const numbers = (list: readonly number[]): BlankOption[] =>
  list.map((n) => ({ value: String(n), label: n.toLocaleString('en') }));
export const LETTERS = opts([...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'], (l) => l);

export const FOOD: Readonly<Record<(typeof DIETS)[number], string>> = {
  carnivore: 'meat',
  herbivore: 'plants',
  omnivore: 'both plants and meat',
  insectivore: 'insects',
  piscivore: 'fish',
  frugivore: 'fruit',
  nectarivore: 'nectar',
  'filter-feeder': 'plankton',
  scavenger: 'dead animals',
};
export const PLACE: Readonly<Record<(typeof HABITATS)[number], string>> = {
  forest: 'a forest',
  rainforest: 'a rainforest',
  grassland: 'grassland',
  desert: 'the desert',
  mountain: 'the mountains',
  polar: 'the polar regions',
  tundra: 'the tundra',
  wetland: 'wetlands',
  freshwater: 'fresh water',
  ocean: 'the ocean',
  coast: 'coastal waters',
  reef: 'a coral reef',
  'deep-sea': 'the deep sea',
  cave: 'caves',
  urban: 'towns and cities',
  farmland: 'farmland',
};
export const CONTINENT: Readonly<Record<(typeof CONTINENTS)[number], string>> = {
  africa: 'Africa',
  asia: 'Asia',
  europe: 'Europe',
  'north-america': 'North America',
  'south-america': 'South America',
  oceania: 'Australia or Oceania',
  antarctica: 'Antarctica',
};
export const withArticle = (word: string) => `${/^[aeiou]/.test(word) ? 'an' : 'a'} ${word}`;
export const SOCIAL_LIFE: Readonly<Record<(typeof SOCIAL)[number], string>> = {
  solitary: 'alone',
  pair: 'in pairs',
  group: 'in a group',
};

/** Body parts with a boolean trait, as they read after "with". */
export const BODY_PARTS = fixed({
  tail: 'a tail',
  gills: 'gills',
  shell: 'a shell',
  horns: 'horns',
  feathers: 'feathers',
  pouch: 'a pouch',
});
export type BodyPart = 'tail' | 'gills' | 'shell' | 'horns' | 'feathers' | 'pouch';

/** Filters for prompts that play on a surprise. */
export const CONTRADICTIONS: Readonly<Record<string, { label: string; filter: AnimalFilter }>> = {
  'flightless-bird': {
    label: "a bird that can't fly",
    filter: {
      op: 'and',
      filters: [
        { op: 'equals', trait: 'class', value: 'bird' },
        { op: 'equals', trait: 'flies', value: false },
      ],
    },
  },
  'egg-laying-mammal': {
    label: 'a mammal that lays eggs',
    filter: {
      op: 'and',
      filters: [
        { op: 'equals', trait: 'class', value: 'mammal' },
        { op: 'equals', trait: 'eggs', value: true },
      ],
    },
  },
};
