import { describe, expect, it } from 'vitest';
import { matchesFilter, queryAnimals, type AnimalFilter } from './traits';
import type { Animal, AnimalTraits } from './types';

const make = (
  id: string,
  display: string,
  traits?: AnimalTraits,
  kind: Animal['kind'] = 'species',
): Animal => ({
  id,
  display,
  aliases: [],
  archetype: 'test',
  movement: 'land',
  size: 'M',
  tint: '#808080',
  emoji: 'x',
  kind,
  ...(traits ? { traits } : {}),
});

const lion = make('lion', 'Lion', {
  class: 'mammal',
  diet: ['carnivore'],
  continent: ['africa', 'asia'],
  legs: 4,
  tail: true,
  social: 'group',
  altitudeM: [0, 3000],
});
const penguin = make('emperor-penguin', 'Emperor penguin', {
  class: 'bird',
  diet: ['piscivore'],
  continent: ['antarctica'],
  legs: 2,
  flies: false,
  depthM: [0, 500],
});
const kakapo = make('kakapo', 'Kākāpō', { class: 'bird', flies: false, continent: ['oceania'] });
const puffin = make('puffin', 'Puffin', { class: 'bird', flies: true }, 'group');
const mystery = make('mystery', 'Mystery animal'); // no traits at all
const all = [lion, penguin, kakapo, puffin, mystery];

const ids = (filter: AnimalFilter) => queryAnimals(all, filter).map((a) => a.id);

describe('queryAnimals', () => {
  it.each<[string, AnimalFilter, string[]]>([
    [
      'equals a string',
      { op: 'equals', trait: 'class', value: 'bird' },
      ['emperor-penguin', 'kakapo', 'puffin'],
    ],
    [
      'equals a boolean',
      { op: 'equals', trait: 'flies', value: false },
      ['emperor-penguin', 'kakapo'],
    ],
    ['equals a number', { op: 'equals', trait: 'legs', value: 4 }, ['lion']],
    ['includes a list value', { op: 'includes', trait: 'continent', value: 'asia' }, ['lion']],
    ['range on a number', { op: 'range', trait: 'legs', min: 3 }, ['lion']],
    [
      'range overlapping a [min, max]',
      { op: 'range', trait: 'depthM', min: 200, max: 1000 },
      ['emperor-penguin'],
    ],
    ['range with no overlap', { op: 'range', trait: 'altitudeM', min: 4000 }, []],
    ['kind', { op: 'kind', kind: 'group' }, ['puffin']],
  ])('%s', (_name, filter, expected) => {
    expect(ids(filter)).toEqual(expected);
  });

  it('never matches an unknown trait, but not() includes it', () => {
    const flies: AnimalFilter = { op: 'equals', trait: 'flies', value: true };
    expect(matchesFilter(mystery, flies)).toBe(false);
    expect(matchesFilter(mystery, { op: 'not', filter: flies })).toBe(true);
    expect(matchesFilter(lion, { op: 'includes', trait: 'habitat', value: 'forest' })).toBe(false);
    expect(matchesFilter(mystery, { op: 'range', trait: 'legs', max: 10 })).toBe(false);
  });

  it('combines with and, or, not', () => {
    const bird: AnimalFilter = { op: 'equals', trait: 'class', value: 'bird' };
    const flightless: AnimalFilter = { op: 'equals', trait: 'flies', value: false };
    expect(ids({ op: 'and', filters: [bird, flightless] })).toEqual(['emperor-penguin', 'kakapo']);
    expect(
      ids({ op: 'or', filters: [{ op: 'equals', trait: 'legs', value: 4 }, flightless] }),
    ).toEqual(['lion', 'emperor-penguin', 'kakapo']);
    expect(ids({ op: 'and', filters: [bird, { op: 'not', filter: flightless }] })).toEqual([
      'puffin',
    ]);
    // Empty combinators: and of nothing is everything, or of nothing is nothing.
    expect(ids({ op: 'and', filters: [] })).toHaveLength(all.length);
    expect(ids({ op: 'or', filters: [] })).toEqual([]);
  });
});

describe('name rules', () => {
  it.each<[string, AnimalFilter, string[]]>([
    // Letters are compared without accents or case: Kākāpō contains "a" and "k".
    ['contains a letter', { op: 'name', name: { rule: 'contains', letter: 'K' } }, ['kakapo']],
    ['starts with', { op: 'name', name: { rule: 'startsWith', text: 'emp' } }, ['emperor-penguin']],
    // Length counts letters only: "Lion" is 4, "Emperor penguin" is 14.
    ['shorter than', { op: 'name', name: { rule: 'lengthLessThan', length: 5 } }, ['lion']],
    [
      'longer than',
      { op: 'name', name: { rule: 'lengthMoreThan', length: 12 } },
      ['emperor-penguin', 'mystery'],
    ],
    [
      'word count',
      { op: 'name', name: { rule: 'wordCount', count: 2 } },
      ['emperor-penguin', 'mystery'],
    ],
    ['double letter', { op: 'name', name: { rule: 'doubleLetter' } }, ['puffin']],
  ])('%s', (_name, filter, expected) => {
    expect(ids(filter)).toEqual(expected);
  });
});
