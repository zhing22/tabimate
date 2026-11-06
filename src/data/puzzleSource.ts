import type { Animal, AnimalId, DateKey, Puzzle } from '@/core/types';

/** Where puzzles and the animal registry come from (static files now, an API later). */
export interface PuzzleSource {
  /** Resolves null when there is no puzzle for that key. Rejects on bad data or network errors. */
  getPuzzle(key: DateKey): Promise<Puzzle | null>;
  getAnimals(): Promise<ReadonlyMap<AnimalId, Animal>>;
}
