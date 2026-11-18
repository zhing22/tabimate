// Groups and species: "penguin" is a group, "African penguin" a species whose
// parent is penguin. Groups can nest (a group's parent is a wider group).
// Every function takes the lookup explicitly, so core stays free of loading.
import type { Animal, AnimalLookup } from './types';

/** The group an animal belongs to, or null (a top-level animal, or a missing parent). */
export const parentOf = (animal: Animal, animals: AnimalLookup): Animal | null =>
  animal.parent === undefined ? null : (animals.get(animal.parent) ?? null);

/** The animals whose parent is this one, in lookup order. */
export const childrenOf = (animal: Animal, animals: AnimalLookup): Animal[] =>
  [...animals.values()].filter((a) => a.parent === animal.id);

/**
 * Every group above an animal, nearest first. Stops at a missing parent or a
 * loop (the validator rejects both), so it always ends.
 */
export function ancestorsOf(animal: Animal, animals: AnimalLookup): Animal[] {
  const out: Animal[] = [];
  const seen = new Set([animal.id]);
  for (let p = parentOf(animal, animals); p && !seen.has(p.id); p = parentOf(p, animals)) {
    out.push(p);
    seen.add(p.id);
  }
  return out;
}

/**
 * The animal whose art stands for this one: a group's representative species,
 * anything else itself. Falls back to the animal if the representative is missing.
 */
export const representativeFor = (animal: Animal, animals: AnimalLookup): Animal =>
  animal.kind === 'group' && animal.representative !== undefined
    ? (animals.get(animal.representative) ?? animal)
    : animal;

/** True when `a` sits somewhere below `b` (African penguin is more specific than penguin). */
export const isMoreSpecific = (a: Animal, b: Animal, animals: AnimalLookup): boolean =>
  ancestorsOf(a, animals).some((g) => g.id === b.id);
