// Journal sets: groups of species to complete ("All bears"). A registry, so a
// new set is a new entry. Members are species only: a group answer ("bear")
// is the family itself, not one of the animals to collect.
import { isMoreSpecific } from '../hierarchy';
import { matchesFilter, type AnimalFilter } from '../traits';
import type { Animal, AnimalLookup } from '../types';
import { isInJournal, type Journal } from './journal';

export interface JournalSet {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  /** Whether an animal belongs; the lookup lets a set follow the group tree. */
  readonly filter: (animal: Animal, animals: AnimalLookup) => boolean;
}

/** Every species below a group (any depth). */
const under =
  (groupId: string) =>
  (animal: Animal, animals: AnimalLookup): boolean => {
    const group = animals.get(groupId);
    return group !== undefined && isMoreSpecific(animal, group, animals);
  };

/** Every animal passing a core/traits.ts filter. */
const having =
  (filter: AnimalFilter) =>
  (animal: Animal): boolean =>
    matchesFilter(animal, filter);

export const JOURNAL_SETS: readonly JournalSet[] = [
  { id: 'bears', name: 'All bears', icon: '🐻', filter: under('bear') },
  { id: 'big-cats', name: 'Big cats', icon: '🐆', filter: under('big-cat') },
  { id: 'penguins', name: 'Penguins', icon: '🐧', filter: under('penguin') },
  { id: 'sharks', name: 'Sharks', icon: '🦈', filter: under('shark') },
  {
    id: 'oceania',
    name: 'Australia and Oceania',
    icon: '🦘',
    filter: having({ op: 'includes', trait: 'continent', value: 'oceania' }),
  },
  {
    id: 'flightless',
    name: "Birds that can't fly",
    icon: '🥚',
    filter: having({
      op: 'and',
      filters: [
        { op: 'equals', trait: 'class', value: 'bird' },
        { op: 'equals', trait: 'flies', value: false },
      ],
    }),
  },
];

/** A set's species, in lookup order. */
export const setMembers = (set: JournalSet, animals: AnimalLookup): Animal[] =>
  [...animals.values()].filter((a) => a.kind === 'species' && set.filter(a, animals));

/** How much of a set is in the journal. An empty set is never complete. */
export function setProgress(
  journal: Journal,
  set: JournalSet,
  animals: AnimalLookup,
): { found: number; total: number; complete: boolean } {
  const members = setMembers(set, animals);
  const found = members.filter((a) => isInJournal(journal, a.id)).length;
  return { found, total: members.length, complete: members.length > 0 && found === members.length };
}
