import { describe, expect, it } from 'vitest';
import type { Animal, AnimalLookup, Puzzle } from '@/core/types';
import { nameCollisions } from './checkNames';

const make = (id: string, display: string, aliases: string[] = [], group = false): Animal => ({
  id,
  display,
  aliases,
  archetype: 'test',
  movement: 'land',
  size: 'M',
  tint: '#808080',
  emoji: 'x',
  kind: group ? 'group' : 'species',
});
const lookup = (...list: Animal[]): AnimalLookup => new Map(list.map((a) => [a.id, a]));
const puzzle = (...ids: string[]): Puzzle => ({
  date: '2026-11-20',
  number: 15,
  prompts: [{ id: 'p', text: 'P', answers: ids.map((animalId) => ({ animalId, level: 1 })) }],
});

describe('nameCollisions', () => {
  it('is empty when every name leads back to its own answer', () => {
    const animals = lookup(
      make('fox', 'Fox', [], true),
      make('red-fox', 'Red fox', ['common fox']),
      make('platypus', 'Platypus', ['duck-billed platypus']),
      make('duck', 'Duck', [], true),
    );
    expect(nameCollisions(puzzle('fox', 'red-fox', 'platypus', 'duck'), animals)).toEqual([]);
  });

  it('reports an alias that normalises into another answer', () => {
    // "foxes" passes the validator's case-only uniqueness check, but plurals
    // normalise, so it is exactly the group "Fox".
    const animals = lookup(make('fox', 'Fox', [], true), make('red-fox', 'Red fox', ['foxes']));
    expect(nameCollisions(puzzle('fox', 'red-fox'), animals)).toEqual([
      'prompts[0] (p): alias "foxes" of "red-fox" resolves to "fox" by exact',
    ]);
  });

  it('reports a display name that normalises into another answer', () => {
    // Both are "fox" after normalising; the tie goes to the group, so the species loses.
    const animals = lookup(make('fox', 'Fox', [], true), make('foxes', 'Foxes'));
    expect(nameCollisions(puzzle('foxes', 'fox'), animals)).toEqual([
      'prompts[0] (p): display name "Foxes" of "foxes" resolves to "fox" by exact',
    ]);
  });
});
