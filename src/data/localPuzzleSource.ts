import { themeFor } from '@/config/themes';
import { isDateKey } from '@/core/date';
import type { AnimalLookup, DateKey } from '@/core/types';
import type { PuzzleSource } from '@/core/puzzleSource';
import { createJsonLoader, loadRequired, MISSING, type JsonLoader } from './jsonLoader';
import { validateAnimals, validatePuzzle } from './validate';
import { validateBonus } from './validateBonus';

export type LocalPuzzleSourceOptions =
  | { readonly baseUrl: string; readonly fetch?: typeof fetch }
  /** Share a loader so files read elsewhere too (animals.json) are fetched once. */
  | { readonly loader: JsonLoader };

export const ANIMALS_FILE = 'data/animals.json';
export const puzzleFile = (key: DateKey): string => `data/puzzles/${key}.json`;
export const bonusFile = (key: DateKey): string => `data/bonus/${key}.json`;

/** Reads puzzles and animals from the static files in public/data. */
export function createLocalPuzzleSource(options: LocalPuzzleSourceOptions): PuzzleSource {
  const loader = 'loader' in options ? options.loader : createJsonLoader(options);
  const load = (file: string) => loader.load(file);

  let animals: Promise<AnimalLookup> | null = null;

  function getAnimals(): Promise<AnimalLookup> {
    animals ??= loadRequired(loader, ANIMALS_FILE)
      .then((json) => validateAnimals(json, ANIMALS_FILE))
      .catch((error: unknown) => {
        animals = null; // let the next call retry instead of caching the failure
        throw error;
      });
    return animals;
  }

  /**
   * The day's bonus quiz, on a day whose theme has one. A missing file means
   * no quiz (validate-data makes sure upcoming quiz days have one).
   */
  async function getBonus(key: DateKey) {
    if (!themeFor(key)?.bonusQuiz) return null;
    const file = bonusFile(key);
    const json = await load(file);
    return json === MISSING ? null : validateBonus(json, file, key);
  }

  async function getPuzzle(key: DateKey) {
    if (!isDateKey(key)) throw new RangeError(`Invalid puzzle key "${key}"`);
    const file = puzzleFile(key);
    const [json, registry, bonus] = await Promise.all([load(file), getAnimals(), getBonus(key)]);
    if (json === MISSING) return null;
    const puzzle = validatePuzzle(json, { file, key, animals: registry });
    return bonus ? { ...puzzle, bonus } : puzzle;
  }

  return { getPuzzle, getAnimals };
}
