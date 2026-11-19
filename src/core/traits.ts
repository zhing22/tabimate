// A small query language over animals, so prompt templates ("a mammal that
// lives in Africa", "an animal whose name has a double letter") can list their
// answers from data. Pure: give it animals and a filter, get the matches.
//
// Unknown is not false: a trait an animal has no value for never matches
// equals, includes or range. `not` inverts a match, so not(equals tail true)
// includes animals whose tail is unknown; prefer equals tail false for "no tail".
import type { Animal, AnimalTraits, MetreRange } from './types';

type Traits = Required<AnimalTraits>;
type KeysOf<T> = { [K in keyof Traits]-?: Traits[K] extends T ? K : never }[keyof Traits];

/** Traits with one value: class, social, size, legs, tail, flies... */
export type ScalarTrait = KeysOf<string | number | boolean>;
/** Traits with a list of values: diet, habitat, continent. */
export type ListTrait = KeysOf<readonly string[]>;
/** Traits with a number or a [min, max] range: legs, altitudeM, depthM. */
export type NumericTrait = KeysOf<number | MetreRange>;

/** Rules on the display name, for word-play prompts. */
export type NameRule =
  | { readonly rule: 'contains'; readonly letter: string }
  | { readonly rule: 'startsWith'; readonly text: string }
  | { readonly rule: 'lengthLessThan'; readonly length: number }
  | { readonly rule: 'lengthMoreThan'; readonly length: number }
  | { readonly rule: 'wordCount'; readonly count: number }
  | { readonly rule: 'doubleLetter' };

export type AnimalFilter =
  | {
      readonly op: 'equals';
      readonly trait: ScalarTrait;
      readonly value: string | number | boolean;
    }
  | { readonly op: 'includes'; readonly trait: ListTrait; readonly value: string }
  | {
      readonly op: 'range';
      readonly trait: NumericTrait;
      readonly min?: number;
      readonly max?: number;
    }
  | { readonly op: 'kind'; readonly kind: Animal['kind'] }
  | { readonly op: 'name'; readonly name: NameRule }
  | { readonly op: 'and'; readonly filters: readonly AnimalFilter[] }
  | { readonly op: 'or'; readonly filters: readonly AnimalFilter[] }
  | { readonly op: 'not'; readonly filter: AnimalFilter };

/** The display name as plain lowercase letters and single spaces: "Kākāpō" -> "kakapo". */
const plainName = (display: string): string =>
  display
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}]+/gu, ' ')
    .trim();

const letters = (display: string): string => plainName(display).replace(/ /g, '');

/** Name rules by id: adding one means adding an entry here. Length counts letters only. */
const NAME_RULES: {
  readonly [R in NameRule['rule']]: (
    display: string,
    rule: Extract<NameRule, { rule: R }>,
  ) => boolean;
} = {
  contains: (d, r) => letters(d).includes(r.letter.toLowerCase()),
  startsWith: (d, r) => plainName(d).startsWith(r.text.toLowerCase()),
  lengthLessThan: (d, r) => letters(d).length < r.length,
  lengthMoreThan: (d, r) => letters(d).length > r.length,
  wordCount: (d, r) => plainName(d).split(' ').length === r.count,
  doubleLetter: (d) => /(\p{L})\1/u.test(letters(d)),
};

const nameMatches = (display: string, name: NameRule): boolean =>
  (NAME_RULES[name.rule] as (d: string, r: NameRule) => boolean)(display, name);

/** A number is in [min, max]; a range overlaps it. Either bound may be open. */
function inRange(value: number | MetreRange, min = -Infinity, max = Infinity): boolean {
  const [low, high] = typeof value === 'number' ? [value, value] : value;
  return high >= min && low <= max;
}

/** Whether one animal passes the filter. */
export function matchesFilter(animal: Animal, filter: AnimalFilter): boolean {
  const traits = animal.traits ?? {};
  switch (filter.op) {
    case 'equals':
      return traits[filter.trait] === filter.value;
    case 'includes':
      return (
        (traits[filter.trait] as readonly string[] | undefined)?.includes(filter.value) ?? false
      );
    case 'range': {
      const value = traits[filter.trait];
      return value !== undefined && inRange(value, filter.min, filter.max);
    }
    case 'kind':
      return animal.kind === filter.kind;
    case 'name':
      return nameMatches(animal.display, filter.name);
    case 'and':
      return filter.filters.every((f) => matchesFilter(animal, f));
    case 'or':
      return filter.filters.some((f) => matchesFilter(animal, f));
    case 'not':
      return !matchesFilter(animal, filter.filter);
  }
}

/** Every animal that passes the filter, in the order given. */
export const queryAnimals = (animals: Iterable<Animal>, filter: AnimalFilter): Animal[] =>
  [...animals].filter((animal) => matchesFilter(animal, filter));
