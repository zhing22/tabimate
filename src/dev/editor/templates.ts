// Prompt templates for the puzzle editor (dev/puzzles.html). Each turns a few
// chosen values into prompt text and a trait filter (core/traits.ts), which
// drafts the answer list. Adding a template means adding an entry to TEMPLATES.
import { ANIMAL_CLASSES, CONTINENTS, DIETS, HABITATS, SOCIAL } from '@/config/traits';
import type { AnimalFilter } from '@/core/traits';

export interface BlankOption {
  readonly value: string;
  /** How the value reads in the prompt text. */
  readonly label: string;
}

export interface Blank {
  readonly name: string;
  readonly label: string;
  /** The allowed values; absent means free text (typed in). */
  readonly options?: readonly BlankOption[];
}

export type BlankValues = Readonly<Record<string, string>>;

export interface PromptTemplate {
  readonly id: string;
  /** Shown in the template picker. */
  readonly label: string;
  /** Prompt text with {blank} placeholders. */
  readonly text: string;
  readonly blanks: readonly Blank[];
  /** The filter that drafts answers; null when answers are added by hand. */
  readonly toFilter: (values: BlankValues) => AnimalFilter | null;
}

const opts = <T extends string>(values: readonly T[], label: (v: T) => string): BlankOption[] =>
  values.map((value) => ({ value, label: label(value) }));
const fixed = (pairs: Readonly<Record<string, string>>): BlankOption[] =>
  Object.entries(pairs).map(([value, label]) => ({ value, label }));
const numbers = (list: readonly number[]): BlankOption[] =>
  list.map((n) => ({ value: String(n), label: n.toLocaleString('en') }));
const LETTERS = opts([...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'], (l) => l);

const FOOD: Readonly<Record<(typeof DIETS)[number], string>> = {
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
const PLACE: Readonly<Record<(typeof HABITATS)[number], string>> = {
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
const CONTINENT: Readonly<Record<(typeof CONTINENTS)[number], string>> = {
  africa: 'Africa',
  asia: 'Asia',
  europe: 'Europe',
  'north-america': 'North America',
  'south-america': 'South America',
  oceania: 'Australia or Oceania',
  antarctica: 'Antarctica',
};
const withArticle = (word: string) => `${/^[aeiou]/.test(word) ? 'an' : 'a'} ${word}`;
const SOCIAL_LIFE: Readonly<Record<(typeof SOCIAL)[number], string>> = {
  solitary: 'alone',
  pair: 'in pairs',
  group: 'in a group',
};

/** Body parts with a boolean trait, as they read after "with". */
const BODY_PARTS = fixed({
  tail: 'a tail',
  gills: 'gills',
  shell: 'a shell',
  horns: 'horns',
  feathers: 'feathers',
  pouch: 'a pouch',
});
type BodyPart = 'tail' | 'gills' | 'shell' | 'horns' | 'feathers' | 'pouch';

/** Filters for prompts that play on a surprise. */
const CONTRADICTIONS: Readonly<Record<string, { label: string; filter: AnimalFilter }>> = {
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

const v = (values: BlankValues, name: string) => values[name] ?? '';

export const TEMPLATES: readonly PromptTemplate[] = [
  {
    id: 'eats',
    label: 'Eats …',
    text: 'Name an animal that eats {food}',
    blanks: [{ name: 'food', label: 'Food', options: opts(DIETS, (d) => FOOD[d]) }],
    toFilter: (x) => ({ op: 'includes', trait: 'diet', value: v(x, 'food') }),
  },
  {
    id: 'body-part',
    label: 'Has a body part',
    text: 'Name an animal with {part}',
    blanks: [{ name: 'part', label: 'Body part', options: BODY_PARTS }],
    toFilter: (x) => ({ op: 'equals', trait: v(x, 'part') as BodyPart, value: true }),
  },
  {
    id: 'habitat',
    label: 'Lives in a habitat',
    text: 'Name an animal that lives in {habitat}',
    blanks: [{ name: 'habitat', label: 'Habitat', options: opts(HABITATS, (h) => PLACE[h]) }],
    toFilter: (x) => ({ op: 'includes', trait: 'habitat', value: v(x, 'habitat') }),
  },
  {
    id: 'continent',
    label: 'From a continent',
    text: 'Name an animal from {continent}',
    blanks: [
      { name: 'continent', label: 'Continent', options: opts(CONTINENTS, (c) => CONTINENT[c]) },
    ],
    toFilter: (x) => ({ op: 'includes', trait: 'continent', value: v(x, 'continent') }),
  },
  {
    id: 'class',
    label: 'Is a class',
    text: 'Name {class}',
    blanks: [{ name: 'class', label: 'Class', options: opts(ANIMAL_CLASSES, withArticle) }],
    toFilter: (x) => ({ op: 'equals', trait: 'class', value: v(x, 'class') }),
  },
  {
    id: 'social',
    label: 'Social life',
    text: 'Name an animal that lives {social}',
    blanks: [{ name: 'social', label: 'Lives', options: opts(SOCIAL, (s) => SOCIAL_LIFE[s]) }],
    toFilter: (x) => ({ op: 'equals', trait: 'social', value: v(x, 'social') }),
  },
  {
    id: 'extinct',
    label: 'Extinct',
    text: 'Name an extinct animal',
    blanks: [],
    toFilter: () => ({ op: 'equals', trait: 'extinct', value: true }),
  },
  {
    id: 'name-contains',
    label: 'Name contains a letter',
    text: 'Name an animal with the letter {letter} in its name',
    blanks: [{ name: 'letter', label: 'Letter', options: LETTERS }],
    toFilter: (x) => ({ op: 'name', name: { rule: 'contains', letter: v(x, 'letter') } }),
  },
  {
    id: 'name-starts',
    label: 'Name starts with',
    text: 'Name an animal whose name starts with {letter}',
    blanks: [{ name: 'letter', label: 'Letter', options: LETTERS }],
    toFilter: (x) => ({ op: 'name', name: { rule: 'startsWith', text: v(x, 'letter') } }),
  },
  {
    id: 'name-length',
    label: 'Name length',
    text: 'Name an animal whose name is {comparison} {length} letters',
    blanks: [
      {
        name: 'comparison',
        label: 'Compared',
        options: fixed({ shorter: 'shorter than', longer: 'longer than' }),
      },
      { name: 'length', label: 'Letters', options: numbers([3, 4, 5, 6, 8, 10, 12, 15]) },
    ],
    toFilter: (x) => ({
      op: 'name',
      name:
        v(x, 'comparison') === 'longer'
          ? { rule: 'lengthMoreThan', length: Number(v(x, 'length')) }
          : { rule: 'lengthLessThan', length: Number(v(x, 'length')) },
    }),
  },
  {
    id: 'altitude',
    label: 'Lives above an altitude',
    text: 'Name an animal that lives above {height} m',
    blanks: [{ name: 'height', label: 'Metres', options: numbers([1000, 2000, 3000, 4000, 5000]) }],
    toFilter: (x) => ({ op: 'range', trait: 'altitudeM', min: Number(v(x, 'height')) }),
  },
  {
    id: 'depth',
    label: 'Found below a depth',
    text: 'Name an animal found deeper than {depth} m',
    blanks: [{ name: 'depth', label: 'Metres', options: numbers([100, 200, 500, 1000, 3000]) }],
    toFilter: (x) => ({ op: 'range', trait: 'depthM', min: Number(v(x, 'depth')) }),
  },
  {
    id: 'contradiction',
    label: 'Contradiction',
    text: 'Name {surprise}',
    blanks: [
      {
        name: 'surprise',
        label: 'Surprise',
        options: Object.entries(CONTRADICTIONS).map(([value, c]) => ({ value, label: c.label })),
      },
    ],
    toFilter: (x) => CONTRADICTIONS[v(x, 'surprise')]?.filter ?? null,
  },
  {
    id: 'free',
    label: 'Free text (answers by hand)',
    text: '{text}',
    blanks: [{ name: 'text', label: 'Prompt text' }],
    toFilter: () => null,
  },
];

export const templateById = (id: string): PromptTemplate | undefined =>
  TEMPLATES.find((t) => t.id === id);

/** The first option of every blank: what a newly picked template starts with. */
export const defaultValues = (template: PromptTemplate): BlankValues =>
  Object.fromEntries(template.blanks.map((b) => [b.name, b.options?.[0]?.value ?? '']));

/** Prompt text with each blank replaced by its value's label (free text as typed). */
export function fillText(template: PromptTemplate, values: BlankValues): string {
  return template.text.replace(/\{(\w+)\}/g, (_, name: string) => {
    const blank = template.blanks.find((b) => b.name === name);
    const value = values[name] ?? '';
    return blank?.options?.find((o) => o.value === value)?.label ?? value;
  });
}

/** A prompt id from the template and values: "eats-carnivore", "name-starts-q". */
export function promptIdFor(template: PromptTemplate, values: BlankValues): string {
  const parts =
    template.id === 'free'
      ? [values.text ?? '']
      : [template.id, ...template.blanks.map((b) => values[b.name] ?? '')];
  return parts
    .join('-')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
    .replace(/-$/, '');
}
