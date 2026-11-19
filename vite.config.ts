import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { devPuzzleApi } from './scripts/vite/devPuzzleApi.ts';

// Shared with vitest.config.ts; mirrors "paths" in tsconfig.json.
export const alias = {
  '@': fileURLToPath(new URL('./src', import.meta.url)),
};

export default defineConfig({
  resolve: { alias },
  // Dev server only (apply: 'serve'): the puzzle editor saves through it.
  plugins: [devPuzzleApi()],
});
