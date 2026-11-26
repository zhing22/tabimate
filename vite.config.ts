import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { buildAssets } from './scripts/vite/buildAssets.ts';
import { devPuzzleApi } from './scripts/vite/devPuzzleApi.ts';
import { earlyFetch } from './scripts/vite/earlyFetch.ts';
import { loadingKit } from './scripts/vite/loadingKit.ts';
import { HASHED_SPRITE_URL } from './scripts/lib/buildAssets.ts';
import {
  DATA_NETWORK_TIMEOUT_S,
  RUNTIME_CACHE_ENTRIES,
  VERSIONED_DATA_FILES,
} from './src/config/data.ts';
import { APP_COLOURS } from './src/config/ui.ts';

// Shared with vitest.config.ts; mirrors "paths" in tsconfig.json.
export const alias = {
  '@': fileURLToPath(new URL('./src', import.meta.url)),
};

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/**
 * The versioned data set (config/data.ts) by path, with no query string, so
 * the loader's fresh retry (?fresh=...) skips the service worker. A RegExp,
 * not a function: generateSW copies the rules into sw.js, where imports don't exist.
 */
export const VERSIONED_DATA = new RegExp(`/(${VERSIONED_DATA_FILES.map(escapeRegExp).join('|')})$`);

/** Each day's puzzle and bonus quiz: the date is in the URL. */
export const DAY_FILES = /\/data\/(puzzles|bonus)\/\d{4}-\d{2}-\d{2}\.json$/;

/**
 * Installable and offline (v3 Step 3). The service worker precaches only the
 * app shell: html, js, css, icons and the font. The rest is cached as used:
 * - sprite sheets, content-hashed by the build: cache first, kept for good;
 * - each day's puzzle and bonus quiz: stale while revalidate, so a revisit
 *   opens at once;
 * - animals, palettes and the sprite manifest: network first, the cache after
 *   DATA_NETWORK_TIMEOUT_S. Each file falls back on its own, so the build
 *   stamps one version into each and the loader refuses a mix
 *   (data/jsonLoader.ts), fetching again past this rule.
 */
const pwa = VitePWA({
  registerType: 'autoUpdate',
  injectRegister: 'script-defer',
  // The glob below already precaches the icons.
  includeManifestIcons: false,
  manifest: {
    name: 'Tabimate',
    short_name: 'Tabimate',
    description: 'A daily journey with animal friends: name animals, grow your party.',
    lang: 'en',
    start_url: '.',
    scope: '.',
    display: 'standalone',
    orientation: 'portrait',
    background_color: APP_COLOURS.night,
    theme_color: APP_COLOURS.night,
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    // The app shell only; sprites and data are cached as they are used (below).
    globPatterns: ['**/*.{js,css,html,woff2}', 'icons/*.{png,svg}'],
    globIgnores: ['dev/**'],
    navigateFallback: 'index.html',
    runtimeCaching: [
      {
        urlPattern: HASHED_SPRITE_URL,
        handler: 'CacheFirst',
        options: {
          cacheName: 'sprites',
          expiration: { maxEntries: RUNTIME_CACHE_ENTRIES.sprites },
        },
      },
      {
        urlPattern: DAY_FILES,
        handler: 'StaleWhileRevalidate',
        options: { cacheName: 'puzzles', expiration: { maxEntries: RUNTIME_CACHE_ENTRIES.days } },
      },
      {
        urlPattern: VERSIONED_DATA,
        handler: 'NetworkFirst',
        options: { cacheName: 'data', networkTimeoutSeconds: DATA_NETWORK_TIMEOUT_S },
      },
    ],
  },
});

export default defineConfig({
  resolve: { alias },
  // Vite's hashed bundles in their own folder, so public/_headers can mark them immutable.
  // The manifest tells scripts/check-bundle.ts which chunks a first visit runs.
  build: { assetsDir: 'assets/build', manifest: true },
  // devPuzzleApi is dev server only (apply: 'serve'): the puzzle editor saves through it.
  // buildAssets (build only) runs before the service worker is generated.
  plugins: [devPuzzleApi(), earlyFetch(), loadingKit(), buildAssets(), pwa],
});
