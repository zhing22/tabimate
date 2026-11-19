import type { Animal, AnimalId, AnimalLookup, Puzzle } from './types';

/**
 * The animals a puzzle can put on screen: every answer, plus the
 * representative of each group answer (a group is drawn with its art). The
 * scene loads sprites for these, rather than the whole registry.
 */
export function puzzleAnimals(puzzle: Puzzle, animals: AnimalLookup): Map<AnimalId, Animal> {
  const out = new Map<AnimalId, Animal>();
  const add = (id: AnimalId | undefined) => {
    const animal = id === undefined ? undefined : animals.get(id);
    if (animal) out.set(animal.id, animal);
    return animal;
  };
  for (const answer of puzzle.prompts.flatMap((p) => p.answers)) {
    add(add(answer.animalId)?.representative);
  }
  return out;
}
