import { FRESH_PARAM } from '@/config/data';
import { DataError } from './dataError';
import { sameVersion, unwrapVersioned, type Versioned } from './versionedData';

/** What load() returns for a file that isn't there. */
export const MISSING = Symbol('missing');

export interface JsonLoaderOptions {
  /** Where public/ is served from, e.g. import.meta.env.BASE_URL. */
  readonly baseUrl: string;
  /** Injected so tests can fake responses. Defaults to the global fetch. */
  readonly fetch?: typeof fetch;
  /**
   * Fetches already in flight, by URL (index.html starts the puzzle and
   * animals at once): each is used once instead of a new request.
   */
  readonly early?: Readonly<Record<string, Promise<Response>>> | undefined;
  /**
   * Files that must come from one build (config/data.ts): asking for any
   * loads them all, and a mix of versions is fetched again past the service
   * worker; still mixed, it is an error rather than mismatched data.
   */
  readonly versionedSet?: readonly string[];
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
  /**
   * Forgets the versioned set: the next load fetches it fresh, past the
   * service worker (a puzzle naming an animal the cached set lacks).
   */
  refreshSet(): void;
}

type Loaded = Versioned | typeof MISSING;

interface Fetcher {
  readonly base: string;
  readonly fetch: (input: string, init: RequestInit) => Promise<Response>;
  readonly early: Map<string, Promise<Response>>;
}

const INIT: RequestInit = { headers: { Accept: 'application/json' } };

/**
 * The response for a file: an early fetch the first time (a normal fetch
 * if that one failed), or, fresh, a URL the service worker's rule skips.
 */
function request(f: Fetcher, file: string, fresh: boolean): Promise<Response> {
  const url = f.base + file;
  if (fresh) return f.fetch(`${url}?${FRESH_PARAM}=${Date.now()}`, INIT);
  const started = f.early.get(url);
  f.early.delete(url);
  return started ? started.catch(() => f.fetch(url, INIT)) : f.fetch(url, INIT);
}

async function fetchJson(f: Fetcher, file: string, fresh = false): Promise<Loaded> {
  let response: Response;
  try {
    response = await request(f, file, fresh);
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
    return unwrapVersioned((await response.json()) as unknown);
  } catch {
    throw new DataError(file, null, 'is not valid JSON');
  }
}

const consistent = (loaded: readonly Loaded[]) =>
  sameVersion(loaded.filter((l): l is Versioned => l !== MISSING));

/** The whole set, from one build: fetched again, fresh, if the versions differ. */
async function loadSet(
  f: Fetcher,
  set: readonly string[],
  fresh: boolean,
): Promise<ReadonlyMap<string, unknown>> {
  const fetchAll = (asFresh: boolean) =>
    Promise.all(set.map((file) => fetchJson(f, file, asFresh)));
  let loaded = await fetchAll(fresh);
  if (!consistent(loaded)) loaded = await fetchAll(true);
  if (!consistent(loaded)) {
    throw new DataError(set.join(', '), null, 'are from different versions of the game');
  }
  return new Map(set.map((file, i) => [file, loaded[i] === MISSING ? MISSING : loaded[i]!.data]));
}

/** Fetches JSON files from public/, with one error style for every caller. */
export function createJsonLoader(options: JsonLoaderOptions): JsonLoader {
  const f: Fetcher = {
    base: options.baseUrl.endsWith('/') ? options.baseUrl : `${options.baseUrl}/`,
    // Called unbound: browsers reject fetch called with a non-window `this`.
    fetch: options.fetch ?? ((input, init) => fetch(input, init)),
    early: new Map(Object.entries(options.early ?? {})),
  };
  const set = options.versionedSet ?? [];
  const cache = new Map<string, Promise<unknown>>();
  let setLoad: Promise<ReadonlyMap<string, unknown>> | null = null;
  let freshSet = false;

  const loadOne = async (file: string): Promise<unknown> => {
    if (!set.includes(file)) {
      const loaded = await fetchJson(f, file);
      return loaded === MISSING ? MISSING : loaded.data;
    }
    setLoad ??= loadSet(f, set, freshSet).catch((error: unknown) => {
      setLoad = null;
      throw error;
    });
    return (await setLoad).get(file);
  };

  return {
    url: (file) => f.base + file,
    load(file) {
      let pending = cache.get(file);
      if (!pending) {
        pending = loadOne(file).catch((error: unknown) => {
          cache.delete(file);
          throw error;
        });
        cache.set(file, pending);
      }
      return pending;
    },
    refreshSet() {
      setLoad = null;
      freshSet = true;
      for (const file of set) cache.delete(file);
    },
  };
}

/** load(), but a missing file is an error: for files the game can't do without. */
export async function loadRequired(loader: JsonLoader, file: string): Promise<unknown> {
  const json = await loader.load(file);
  if (json === MISSING) throw new DataError(file, null, 'was not found');
  return json;
}
