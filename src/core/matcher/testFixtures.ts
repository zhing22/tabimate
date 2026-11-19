// Test-only data shared by the matcher tests. Not imported by the app.
import type { AnswerLevel } from '@/config/levels';
import type { Animal, AnimalId, Prompt } from '../types';
import { normalize } from './normalize';
import { trigrams } from './similarity';
import type { Candidate } from './types';

const animal = (id: AnimalId, display: string, aliases: string[] = []): Animal => ({
  id,
  display,
  aliases,
  archetype: 'test',
  movement: 'land',
  size: 'M',
  tint: '#808080',
  emoji: '🐾',
  kind: 'species',
});

export const ANIMALS: ReadonlyMap<AnimalId, Animal> = new Map(
  [
    animal('platypus', 'Platypus'),
    animal('killer-whale', 'Killer whale', ['orca']),
    animal('red-fox', 'Red fox', ['fox']),
    animal('brown-bear', 'Brown bear'),
    animal('sun-bear', 'Sun bear'),
    animal('snow-leopard', 'Snow leopard'),
    animal('tiger', 'Tiger'),
    animal('amur-leopard', 'Amur leopard'),
    // A group and two of its species, at different levels.
    { ...animal('penguin', 'Penguin'), kind: 'group' as const, representative: 'emperor-penguin' },
    { ...animal('emperor-penguin', 'Emperor penguin'), parent: 'penguin' },
    { ...animal('african-penguin', 'African penguin', ['cape penguin']), parent: 'penguin' },
  ].map((a) => [a.id, a]),
);

export const PROMPT: Prompt = {
  id: 'test-prompt',
  text: 'Name any animal',
  answers: [
    { animalId: 'platypus', level: 2 },
    { animalId: 'killer-whale', level: 1 },
    { animalId: 'red-fox', level: 1 },
    { animalId: 'brown-bear', level: 1 },
    { animalId: 'sun-bear', level: 3 },
    { animalId: 'snow-leopard', level: 3 },
    { animalId: 'tiger', level: 4 },
    { animalId: 'amur-leopard', level: 5 },
    { animalId: 'penguin', level: 1 },
    { animalId: 'emperor-penguin', level: 2 },
    { animalId: 'african-penguin', level: 4 },
  ],
};

/** A candidate built by hand, for strategy tests that skip the registry. */
export function candidate(animalId: AnimalId, level: AnswerLevel, ...names: string[]): Candidate {
  const normalized = names.map(normalize);
  return { animalId, level, group: false, names: normalized, grams: normalized.map(trigrams) };
}

/** The same, as a group ("penguin") rather than a species. */
export const groupCandidate = (animalId: AnimalId, level: AnswerLevel, ...names: string[]) => ({
  ...candidate(animalId, level, ...names),
  group: true,
});
