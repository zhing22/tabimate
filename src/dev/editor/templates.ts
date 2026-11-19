// Prompt templates for the puzzle editor (dev/puzzles.html). Each turns a few
// chosen values into prompt text and a trait filter (core/traits.ts), which
// drafts the answer list. Adding a template means adding an entry to TEMPLATES.
import { ANIMAL_CLASSES, CONTINENTS, DIETS, HABITATS, SOCIAL } from '@/config/traits';
import {
  BODY_PARTS,
  CONTINENT,
  CONTRADICTIONS,
  FOOD,
  LETTERS,
  PLACE,
  SOCIAL_LIFE,
  fixed,
  numbers,
  opts,
  withArticle,
  type BodyPart,
} from './templateWords';
import type { BlankValues, PromptTemplate } from './templateText';

// The template types and text helpers, re-exported so callers need one import.
export * from './templateText';

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
