import type { Animal, AnimalId } from '../types';
import { normalize } from './normalize';

type Animals = ReadonlyMap<AnimalId, Animal>;

interface NamedAnimal {
  readonly id: AnimalId;
  /** Normalized, padded with spaces so a lookup only finds whole words. */
  readonly padded: string;
}

const cache = new WeakMap<Animals, readonly NamedAnimal[]>();

function namesOf(animals: Animals): readonly NamedAnimal[] {
  let names = cache.get(animals);
  if (!names) {
    names = [...animals.values()].flatMap((animal) =>
      [animal.display, ...animal.aliases]
        .map(normalize)
        .filter((name) => name !== '')
        .map((name) => ({ id: animal.id, padded: ` ${name} ` })),
    );
    cache.set(animals, names);
  }
  return names;
}

/**
 * True if a (normalized) guess names two or more different animals as whole
 * words, e.g. "platypus tiger koala". Such a list is never one answer: without
 * this, partial or loose matching would pick an answer out of it, and pasting
 * a list would beat naming one animal. A name inside a longer one found in the
 * same guess ("bear" in "polar bear") does not count twice.
 */
export function namesSeveralAnimals(text: string, animals: Animals): boolean {
  const padded = ` ${text} `;
  const found = namesOf(animals).filter((n) => padded.includes(n.padded));
  const ids = new Set(
    found
      .filter((n) => !found.some((o) => o.padded !== n.padded && o.padded.includes(n.padded)))
      .map((n) => n.id),
  );
  return ids.size >= 2;
}
