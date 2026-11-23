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

/** In any of these sets' filters ("whales and dolphins"). */
const either =
  (...filters: JournalSet['filter'][]) =>
  (animal: Animal, animals: AnimalLookup): boolean =>
    filters.some((f) => f(animal, animals));

/** One animal by id, for a species that sits under no group. */
const is =
  (id: string) =>
  (animal: Animal): boolean =>
    animal.id === id;

const ofClass = (value: string): AnimalFilter => ({ op: 'equals', trait: 'class', value });

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
    id: 'whales',
    name: 'Whales and dolphins',
    icon: '🐋',
    filter: either(under('whale'), under('dolphin')),
  },
  {
    id: 'seals',
    name: 'Seals and sea cows',
    icon: '🦭',
    filter: either(under('seal'), under('sea-cow')),
  },
  { id: 'elephants', name: 'Elephants', icon: '🐘', filter: under('elephant') },
  {
    id: 'primates',
    name: 'Apes and monkeys',
    icon: '🐒',
    filter: either(
      ...['gorilla', 'orangutan', 'monkey', 'gibbon', 'lemur'].map(under),
      is('chimpanzee'),
    ),
  },
  {
    id: 'rabbits',
    name: 'Rabbits and hares',
    icon: '🐇',
    filter: either(under('rabbit'), under('hare')),
  },
  {
    id: 'deer',
    name: 'Deer and antelope',
    icon: '🦌',
    filter: either(under('deer'), under('antelope')),
  },
  {
    id: 'birds-of-prey',
    name: 'Birds of prey',
    icon: '🦅',
    filter: either(...['eagle', 'hawk', 'falcon', 'condor', 'vulture'].map(under)),
  },
  { id: 'owls', name: 'Owls', icon: '🦉', filter: under('owl') },
  { id: 'parrots', name: 'Parrots', icon: '🦜', filter: under('parrot') },
  { id: 'reptiles', name: 'Reptiles', icon: '🦎', filter: having(ofClass('reptile')) },
  { id: 'amphibians', name: 'Amphibians', icon: '🐸', filter: having(ofClass('amphibian')) },
  { id: 'fish', name: 'Fish', icon: '🐟', filter: having(ofClass('fish')) },
  {
    id: 'bugs',
    name: 'Insects and spiders',
    icon: '🐞',
    filter: having({ op: 'or', filters: [ofClass('insect'), ofClass('arachnid')] }),
  },
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
      filters: [ofClass('bird'), { op: 'equals', trait: 'flies', value: false }],
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
