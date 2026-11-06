import type { Animal, AnimalId, Prompt } from '../types';
import { normalize } from './normalize';
import { trigrams } from './similarity';
import type { Candidate } from './types';

type Animals = ReadonlyMap<AnimalId, Animal>;

// Every guess on a prompt reuses the same candidates, so build them once.
const cache = new WeakMap<Prompt, { animals: Animals; candidates: readonly Candidate[] }>();

/** The prompt's answers with their names normalized and trigrams precomputed. */
export function buildCandidates(prompt: Prompt, animals: Animals): readonly Candidate[] {
  const cached = cache.get(prompt);
  if (cached?.animals === animals) return cached.candidates;

  const candidates = prompt.answers.map(({ animalId, tier }): Candidate => {
    const animal = animals.get(animalId);
    // Validation guarantees the animal exists; the id is a fallback so play goes on.
    const raw = animal ? [animal.display, ...animal.aliases] : [animalId];
    const names = [...new Set(raw.map(normalize).filter((name) => name !== ''))];
    return { animalId, tier, names, grams: names.map(trigrams) };
  });
  cache.set(prompt, { animals, candidates });
  return candidates;
}
