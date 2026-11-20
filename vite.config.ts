import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { devPuzzleApi } from './scripts/vite/devPuzzleApi.ts';

// Shared with vitest.config.ts; mirrors "paths" in tsconfig.json.
export const alias = {
  '@': fileURLToPath(new URL('./src', import.meta.url)),
};

/**
 * Installable and offline: the service worker precaches the app shell and the
 * art (sprites, icons), so the game opens without a network. Game data is
 * network-first: a new day's puzzle is always fetched fresh when online, and
 * the last copy is used offline. Fonts are cached as they are first used.
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
    background_color: '#1d2b3a',
    theme_color: '#1d2b3a',
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    // The shell and art; data/ is left to the network-first rule below.
    globPatterns: ['**/*.{js,css,html,svg,png,webp,json}'],
    globIgnores: ['data/**', 'dev/**'],
    navigateFallback: 'index.html',
    runtimeCaching: [
      {
        urlPattern: ({ url }) => /\/data\/puzzles\/[^/]+\.json$/.test(url.pathname),
        handler: 'NetworkFirst',
        options: {
          cacheName: 'puzzles',
          networkTimeoutSeconds: 4,
          expiration: { maxEntries: 30 },
        },
      },
      {
        // animals.json and the other data files: fresh when online, cached for offline.
        urlPattern: ({ url }) => /\/data\/[^/]+\.json$/.test(url.pathname),
        handler: 'NetworkFirst',
        options: { cacheName: 'data', networkTimeoutSeconds: 4 },
      },
      {
        urlPattern: ({ url }) =>
          url.origin === 'https://fonts.googleapis.com' ||
          url.origin === 'https://fonts.gstatic.com',
        handler: 'StaleWhileRevalidate',
        options: { cacheName: 'fonts', expiration: { maxEntries: 10 } },
      },
    ],
  },
});

export default defineConfig({
  resolve: { alias },
  // devPuzzleApi is dev server only (apply: 'serve'): the puzzle editor saves through it.
  plugins: [devPuzzleApi(), pwa],
});
