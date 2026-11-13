import { DataError } from './dataError';

/** What load() returns for a file that isn't there. */
export const MISSING = Symbol('missing');

export interface JsonLoaderOptions {
  /** Where public/ is served from, e.g. import.meta.env.BASE_URL. */
  readonly baseUrl: string;
  /** Injected so tests can fake responses. Defaults to the global fetch. */
  readonly fetch?: typeof fetch;
}

export interface JsonLoader {
  /** Full URL of a file under public/. */
  url(file: string): string;
  /**
   * The file's parsed JSON, or MISSING if it doesn't exist. Each file is
   * fetched and parsed once and shared (animals.json is read by the puzzle
   * source and the sprite art); a failed load is retried on the next call.
   */
  load(file: string): Promise<unknown>;
}

/** Fetches JSON files from public/, with one error style for every caller. */
export function createJsonLoader(options: JsonLoaderOptions): JsonLoader {
  const base = options.baseUrl.endsWith('/') ? options.baseUrl : `${options.baseUrl}/`;
  // Called unbound: browsers reject fetch called with a non-window `this`.
  const fetchFn =
    options.fetch ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));
  const cache = new Map<string, Promise<unknown>>();

  async function fetchJson(file: string): Promise<unknown> {
    let response: Response;
    try {
      response = await fetchFn(base + file, { headers: { Accept: 'application/json' } });
    } catch (error) {
      throw new DataError(file, null, `could not be fetched (${String(error)})`);
    }
    if (response.status === 404) return MISSING;
    if (!response.ok) {
      throw new DataError(file, null, `could not be fetched (HTTP ${response.status})`);
    }
    // Vite dev and Cloudflare Pages answer unknown paths with index.html and a 200.
    if (!(response.headers.get('content-type') ?? '').includes('json')) return MISSING;
    try {
      return (await response.json()) as unknown;
    } catch {
      throw new DataError(file, null, 'is not valid JSON');
    }
  }

  return {
    url: (file) => base + file,
    load(file) {
      let pending = cache.get(file);
      if (!pending) {
        pending = fetchJson(file).catch((error: unknown) => {
          cache.delete(file);
          throw error;
        });
        cache.set(file, pending);
      }
      return pending;
    },
  };
}

/** load(), but a missing file is an error: for files the game can't do without. */
export async function loadRequired(loader: JsonLoader, file: string): Promise<unknown> {
  const json = await loader.load(file);
  if (json === MISSING) throw new DataError(file, null, 'was not found');
  return json;
}
