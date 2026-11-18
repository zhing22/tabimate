import { describe, expect, it } from 'vitest';
import { ancestorsOf, childrenOf, isMoreSpecific, parentOf, representativeFor } from './hierarchy';
import type { Animal, AnimalLookup } from './types';

const make = (id: string, extra: Partial<Animal> = {}): Animal => ({
  id,
  display: id,
  aliases: [],
  archetype: 'test',
  movement: 'land',
  size: 'M',
  tint: '#808080',
  emoji: 'x',
  kind: 'species',
  ...extra,
});

const bird = make('bird', { kind: 'group', representative: 'emperor' });
const penguin = make('penguin', { kind: 'group', parent: 'bird', representative: 'emperor' });
const emperor = make('emperor', { parent: 'penguin' });
const african = make('african', { parent: 'penguin' });
const fox = make('fox');
const lookup: AnimalLookup = new Map([bird, penguin, emperor, african, fox].map((a) => [a.id, a]));

describe('parentOf', () => {
  it('finds the group, or null at the top or for a missing parent', () => {
    expect(parentOf(emperor, lookup)).toBe(penguin);
    expect(parentOf(fox, lookup)).toBeNull();
    expect(parentOf(make('lost', { parent: 'nowhere' }), lookup)).toBeNull();
  });
});

describe('childrenOf', () => {
  it('lists direct children only', () => {
    expect(childrenOf(penguin, lookup)).toEqual([emperor, african]);
    expect(childrenOf(bird, lookup)).toEqual([penguin]);
    expect(childrenOf(fox, lookup)).toEqual([]);
  });
});

describe('ancestorsOf', () => {
  it('walks up, nearest first', () => {
    expect(ancestorsOf(emperor, lookup)).toEqual([penguin, bird]);
    expect(ancestorsOf(bird, lookup)).toEqual([]);
  });

  it('stops on a loop', () => {
    const a = make('a', { kind: 'group', parent: 'b' });
    const b = make('b', { kind: 'group', parent: 'a' });
    const loop: AnimalLookup = new Map([a, b].map((x) => [x.id, x]));
    expect(ancestorsOf(a, loop)).toEqual([b]);
  });
});

describe('representativeFor', () => {
  it("gives a group's representative and a species itself", () => {
    expect(representativeFor(penguin, lookup)).toBe(emperor);
    expect(representativeFor(african, lookup)).toBe(african);
  });

  it('falls back to the group when its representative is missing', () => {
    const odd = make('odd', { kind: 'group', representative: 'gone' });
    expect(representativeFor(odd, lookup)).toBe(odd);
  });
});

describe('isMoreSpecific', () => {
  it('is true for any descendant, false otherwise', () => {
    expect(isMoreSpecific(emperor, penguin, lookup)).toBe(true);
    expect(isMoreSpecific(emperor, bird, lookup)).toBe(true);
    expect(isMoreSpecific(penguin, emperor, lookup)).toBe(false);
    expect(isMoreSpecific(emperor, african, lookup)).toBe(false);
    expect(isMoreSpecific(emperor, emperor, lookup)).toBe(false);
  });
});
