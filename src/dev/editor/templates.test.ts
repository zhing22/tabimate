import { describe, expect, it } from 'vitest';
import { queryAnimals } from '@/core/traits';
import type { Animal, AnimalTraits } from '@/core/types';
import { defaultValues, fillText, promptIdFor, templateById, TEMPLATES } from './templates';

const make = (id: string, display: string, traits: AnimalTraits): Animal => ({
  id,
  display,
  aliases: [],
  archetype: 'test',
  movement: 'land',
  size: 'M',
  tint: '#808080',
  emoji: 'x',
  kind: 'species',
  traits,
});
const animals = [
  make('lion', 'Lion', { class: 'mammal', diet: ['carnivore'], continent: ['africa'], tail: true }),
  make('emu', 'Emu', { class: 'bird', flies: false, feathers: true }),
  make('platypus', 'Platypus', { class: 'mammal', eggs: true, tail: true }),
  make('dodo', 'Dodo', { class: 'bird', extinct: true, flies: false }),
  make('yak', 'Wild yak', { class: 'mammal', altitudeM: [3000, 5500], social: 'group' }),
];
const ids = (templateId: string, values: Record<string, string>) => {
  const filter = templateById(templateId)!.toFilter(values);
  return filter ? queryAnimals(animals, filter).map((a) => a.id) : null;
};

describe('TEMPLATES', () => {
  it('have unique ids, and every blank in the text is defined', () => {
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
    for (const t of TEMPLATES) {
      const named = [...t.text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
      expect(named.sort(), t.id).toEqual(t.blanks.map((b) => b.name).sort());
    }
  });

  it.each(TEMPLATES.map((t) => [t.id, t] as const))(
    '%s fills its text and builds a working filter from its defaults',
    (_id, t) => {
      const values = t.id === 'free' ? { text: 'Name a pet' } : defaultValues(t);
      expect(fillText(t, values)).not.toMatch(/[{}]/);
      const filter = t.toFilter(values);
      if (t.id === 'free') expect(filter).toBeNull();
      else expect(() => queryAnimals(animals, filter!)).not.toThrow();
    },
  );

  it.each([
    ['eats', { food: 'carnivore' }, 'Name an animal that eats meat', ['lion']],
    ['body-part', { part: 'tail' }, 'Name an animal with a tail', ['lion', 'platypus']],
    ['continent', { continent: 'africa' }, 'Name an animal from Africa', ['lion']],
    ['class', { class: 'amphibian' }, 'Name an amphibian', []],
    ['class', { class: 'bird' }, 'Name a bird', ['emu', 'dodo']],
    ['social', { social: 'group' }, 'Name an animal that lives in a group', ['yak']],
    ['extinct', {}, 'Name an extinct animal', ['dodo']],
    [
      'name-contains',
      { letter: 'Y' },
      'Name an animal with the letter Y in its name',
      ['platypus', 'yak'],
    ],
    ['name-starts', { letter: 'D' }, 'Name an animal whose name starts with D', ['dodo']],
    [
      'name-length',
      { comparison: 'shorter', length: '4' },
      'Name an animal whose name is shorter than 4 letters',
      ['emu'],
    ],
    ['altitude', { height: '4000' }, 'Name an animal that lives above 4,000 m', ['yak']],
    [
      'contradiction',
      { surprise: 'flightless-bird' },
      "Name a bird that can't fly",
      ['emu', 'dodo'],
    ],
    [
      'contradiction',
      { surprise: 'egg-laying-mammal' },
      'Name a mammal that lays eggs',
      ['platypus'],
    ],
    ['free', { text: 'Name a pet' }, 'Name a pet', null],
  ] as const)('%s %o reads %j and finds %o', (id, values, text, found) => {
    expect(fillText(templateById(id)!, values)).toBe(text);
    expect(ids(id, values)).toEqual(found);
  });
});

describe('promptIdFor', () => {
  it('builds a stable lowercase id from the template and values', () => {
    expect(promptIdFor(templateById('eats')!, { food: 'carnivore' })).toBe('eats-carnivore');
    expect(promptIdFor(templateById('name-starts')!, { letter: 'Q' })).toBe('name-starts-q');
    expect(promptIdFor(templateById('free')!, { text: "Name a pet you'd keep!" })).toBe(
      'name-a-pet-you-d-keep',
    );
  });
});
