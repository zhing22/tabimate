import { isDateKey } from '@/core/date';
import type { DateKey } from '@/core/types';
import type { PuzzleSource } from '@/core/puzzleSource';
import { createJsonLoader, loadRequired, MISSING, type JsonLoader } from './jsonLoader';
import { validateAnimals, validatePuzzle, type AnimalRegistry } from './validate';

export type LocalPuzzleSourceOptions =
  | { readonly baseUrl: string; readonly fetch?: typeof fetch }
  /** Share a loader so files read elsewhere too (animals.json) are fetched once. */
  | { readonly loader: JsonLoader };

export const ANIMALS_FILE = 'data/animals.json';
export const puzzleFile = (key: DateKey): string => `data/puzzles/${key}.json`;

/** Reads puzzles and animals from the static files in public/data. */
export function createLocalPuzzleSource(options: LocalPuzzleSourceOptions): PuzzleSource {
  const loader = 'loader' in options ? options.loader : createJsonLoader(options);
  const load = (file: string) => loader.load(file);

  let animals: Promise<AnimalRegistry> | null = null;

  function getAnimals(): Promise<AnimalRegistry> {
    animals ??= loadRequired(loader, ANIMALS_FILE)
      .then((json) => validateAnimals(json, ANIMALS_FILE))
      .catch((error: unknown) => {
        animals = null; // let the next call retry instead of caching the failure
        throw error;
      });
    return animals;
  }

  async function getPuzzle(key: DateKey) {
    if (!isDateKey(key)) throw new RangeError(`Invalid puzzle key "${key}"`);
    const file = puzzleFile(key);
    const [json, registry] = await Promise.all([load(file), getAnimals()]);
    return json === MISSING ? null : validatePuzzle(json, { file, key, animals: registry });
  }

  return { getPuzzle, getAnimals };
}
