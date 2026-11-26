// Game data files and how they are cached (v3 Step 3). No imports: the build
// (vite.config.ts and its plugins) reads this file too.

/**
 * Files that must come from the same build: the build writes one version
 * into each (scripts/vite/buildAssets.ts, as { dataVersion, data }), and the
 * loader (data/jsonLoader.ts) loads them together and refuses a mix (a slow
 * network can make the service worker answer some from its cache).
 */
export const VERSIONED_DATA_FILES = [
  'data/animals.json',
  'data/palettes.json',
  'data/master-palette.json',
  'assets/sprites/manifest.json',
] as const;

/** The key a versioned file's payload sits under, beside dataVersion. */
export const DATA_VERSION_KEY = 'dataVersion';

/**
 * A request with this query parameter skips the service worker's data rule
 * (straight to the network): the loader's second try after a version mix.
 */
export const FRESH_PARAM = 'fresh';

/** Seconds the service worker waits on the network for versioned data before using its cache. */
export const DATA_NETWORK_TIMEOUT_S = 3;

/** The early fetches index.html starts, keyed by URL (scripts/vite/earlyFetch.ts). */
export const EARLY_FETCH_GLOBAL = '__tabimateEarly';

/**
 * After a lazy chunk fails to load (a new version deployed mid-session: the
 * old chunks are gone), the page reloads once, and not again within this
 * long, so an offline failure can't loop (ui/newVersion.ts).
 */
export const NEW_VERSION_RELOAD_GUARD_MS = 30_000;

/**
 * Hex digits of content hash in a built sprite sheet's name (bear.<hash>.png).
 * The build, the service worker's sprite rule and _headers' match all follow
 * it (scripts/lib/buildAssets.ts builds both patterns from it).
 */
export const SPRITE_HASH_LENGTH = 10;

/** How many entries the service worker keeps per runtime cache (vite.config.ts). */
export const RUNTIME_CACHE_ENTRIES = {
  /** Hashed sprite sheets: about 100 archetypes, two files each, and old versions. */
  sprites: 500,
  /** Days' puzzle and bonus files. */
  days: 30,
} as const;
