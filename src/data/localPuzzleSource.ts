import { isDateKey } from '@/core/date';
import type { DateKey } from '@/core/types';
import { DataError } from './dataError';
import type { PuzzleSource } from './puzzleSource';
import { validateAnimals, validatePuzzle, type AnimalRegistry } from './validate';

export interface LocalPuzzleSourceOptions {
  /** Where public/ is served from, e.g. import.meta.env.BASE_URL. */
  readonly baseUrl: string;
  /** Injected so tests can fake responses. Defaults to the global fetch. */
  readonly fetch?: typeof fetch;
}

export const ANIMALS_FILE = 'data/animals.json';
export const puzzleFile = (key: DateKey): string => `data/puzzles/${key}.json`;

const MISSING = Symbol('missing');

/** Reads puzzles and animals from the static files in public/data. */
export function createLocalPuzzleSource(options: LocalPuzzleSourceOptions): PuzzleSource {
  const base = options.baseUrl.endsWith('/') ? options.baseUrl : `${options.baseUrl}/`;
  // Called unbound: browsers reject fetch called with a non-window `this`.
  const fetchFn =
    options.fetch ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));

  async function load(file: string): Promise<unknown> {
    let response: Response;
    try {
      response = await fetchFn(base + file, { headers: { Accept: 'application/json' } });
    } catch (error) {
      throw new DataError(file, null, `could not be fetched (${String(error)})`);
    }
    if (response.status === 404) return MISSING;
    if (!response.ok)
      throw new DataError(file, null, `could not be fetched (HTTP ${response.status})`);
    // Vite dev and Cloudflare Pages answer unknown paths with index.html and a 200.
    if (!(response.headers.get('content-type') ?? '').includes('json')) return MISSING;
    try {
      return (await response.json()) as unknown;
    } catch {
      throw new DataError(file, null, 'is not valid JSON');
    }
  }

  let animals: Promise<AnimalRegistry> | null = null;

  function getAnimals(): Promise<AnimalRegistry> {
    animals ??= load(ANIMALS_FILE)
      .then((json) => {
        if (json === MISSING) throw new DataError(ANIMALS_FILE, null, 'was not found');
        return validateAnimals(json, ANIMALS_FILE);
      })
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
