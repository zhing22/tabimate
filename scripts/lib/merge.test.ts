import { describe, expect, it } from 'vitest';
import type { ListedAnimal } from './animalList';
import {
  inheritGroupClass,
  mergeDescriptions,
  mergeTraits,
  type AnimalJson,
  type TraitDraft,
} from './merge';

const listed = (id: string, extra: Partial<ListedAnimal> = {}): ListedAnimal => ({
  id,
  kind: 'species',
  display: id,
  wikiTitle: id,
  line: 1,
  ...extra,
});
const draft = (l: ListedAnimal, traits: TraitDraft['traits'] = {}): TraitDraft => ({
  listed: l,
  wiki: `https://en.wikipedia.org/wiki/${l.id}`,
  qid: 'Q1',
  traits,
  problems: [],
});

const lion: AnimalJson = {
  id: 'lion',
  display: 'Lion',
  aliases: [],
  kind: 'species',
  archetype: 'big-cat',
  movement: 'land',
  size: 'L',
  tint: '#c8902c',
  emoji: 'L',
  traits: { class: 'mammal', size: 'huge' },
};

describe('mergeTraits', () => {
  it('fills only empty fields of an existing animal', () => {
    const { animals, filled, added } = mergeTraits(
      [lion],
      [draft(listed('lion'), { class: 'bird', size: 'large', continent: ['africa'] })],
    );
    expect(added).toEqual([]);
    expect(filled).toEqual({ lion: ['traits.continent', 'wiki'] });
    expect(animals[0]!.traits).toEqual({ class: 'mammal', size: 'huge', continent: ['africa'] });
    expect(animals[0]!.wiki).toBe('https://en.wikipedia.org/wiki/lion');
  });

  it('never overwrites a wiki link or parent already set', () => {
    const set = { ...lion, wiki: 'https://en.wikipedia.org/wiki/Mine', parent: 'cats' };
    const { animals, filled } = mergeTraits([set], [draft(listed('lion', { parent: 'other' }))]);
    expect(animals[0]).toMatchObject({
      wiki: 'https://en.wikipedia.org/wiki/Mine',
      parent: 'cats',
    });
    expect(filled).toEqual({});
  });

  it('adds new animals, a group before its species, species inheriting its looks', () => {
    const frog = listed('frog', {
      kind: 'group',
      representative: 'bullfrog',
      emoji: 'F',
      movement: 'land',
    });
    const bullfrog = listed('bullfrog', { parent: 'frog' });
    const { animals, added } = mergeTraits(
      [lion],
      [draft(bullfrog, { class: 'amphibian', size: 'small' }), draft(frog, { class: 'amphibian' })],
    );
    expect(added).toEqual(['frog', 'bullfrog']);
    const [, groupRecord, speciesRecord] = animals;
    expect(groupRecord).toMatchObject({
      id: 'frog',
      kind: 'group',
      representative: 'bullfrog',
      archetype: 'frog',
      movement: 'land',
      emoji: 'F',
    });
    expect(speciesRecord).toMatchObject({
      id: 'bullfrog',
      parent: 'frog',
      archetype: 'frog',
      emoji: 'F',
      size: 'S',
      traits: { class: 'amphibian', size: 'small' },
    });
    // Fields come out in animals.json order.
    expect(Object.keys(speciesRecord!).slice(0, 5)).toEqual([
      'id',
      'display',
      'aliases',
      'kind',
      'parent',
    ]);
  });

  it('gives an animal without a group looks from its class', () => {
    const { animals } = mergeTraits([], [draft(listed('salmon'), { class: 'fish' })]);
    expect(animals[0]).toMatchObject({
      archetype: 'fish',
      movement: 'water',
      emoji: '🐟',
      size: 'M',
    });
  });
});

describe('mergeDescriptions', () => {
  it('fills a missing description as unreviewed, and keeps existing ones', () => {
    const described = { ...lion, id: 'tiger', description: 'Mine.', descriptionReviewed: true };
    const { animals, described: ids } = mergeDescriptions(
      [lion, described],
      [
        { id: 'lion', description: 'A big cat.', wiki: 'https://en.wikipedia.org/wiki/Lion' },
        { id: 'tiger', description: 'Other.', wiki: 'https://en.wikipedia.org/wiki/Tiger' },
      ],
    );
    expect(ids).toEqual(['lion']);
    expect(animals[0]).toMatchObject({
      description: 'A big cat.',
      descriptionReviewed: false,
      wiki: 'https://en.wikipedia.org/wiki/Lion',
    });
    expect(animals[1]).toEqual(described);
  });
});

describe('inheritGroupClass', () => {
  const sp = (id: string, parent: string, cls?: string): AnimalJson => ({
    id,
    kind: 'species',
    parent,
    ...(cls ? { traits: { class: cls } } : {}),
  });
  const gr = (id: string, parent?: string, traits?: object): AnimalJson => ({
    id,
    kind: 'group',
    ...(parent ? { parent } : {}),
    ...(traits ? { traits } : {}),
  });

  it('fills a group class when all its species (at any depth) agree', () => {
    const { animals, filled } = inheritGroupClass([
      gr('whale'),
      sp('blue', 'whale', 'mammal'),
      gr('rorqual', 'whale'),
      sp('fin', 'rorqual', 'mammal'),
    ]);
    expect(filled).toEqual(['whale', 'rorqual']);
    expect(animals[0]!.traits).toEqual({ class: 'mammal', feathers: false });
  });

  it('leaves a group alone when its species disagree, one is unknown, or it has a class', () => {
    const { filled } = inheritGroupClass([
      gr('mixed'),
      sp('a', 'mixed', 'fish'),
      sp('b', 'mixed', 'mammal'),
      gr('partly'),
      sp('c', 'partly', 'bird'),
      sp('d', 'partly'),
      gr('set', undefined, { class: 'bird' }),
      sp('e', 'set', 'mammal'),
      gr('empty'),
    ]);
    expect(filled).toEqual([]);
  });
});
