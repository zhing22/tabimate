// Test-only data shared by the matcher tests. Not imported by the app.
import type { AnswerTierId } from '@/config/tiers';
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
  ].map((a) => [a.id, a]),
);

export const PROMPT: Prompt = {
  id: 'test-prompt',
  text: 'Name any animal',
  answers: [
    { animalId: 'platypus', tier: 2 },
    { animalId: 'killer-whale', tier: 1 },
    { animalId: 'red-fox', tier: 1 },
    { animalId: 'brown-bear', tier: 1 },
    { animalId: 'sun-bear', tier: 3 },
    { animalId: 'snow-leopard', tier: 3 },
    { animalId: 'tiger', tier: 4 },
    { animalId: 'amur-leopard', tier: 5 },
  ],
};

/** A candidate built by hand, for strategy tests that skip the registry. */
export function candidate(animalId: AnimalId, tier: AnswerTierId, ...names: string[]): Candidate {
  const normalized = names.map(normalize);
  return { animalId, tier, names: normalized, grams: normalized.map(trigrams) };
}
