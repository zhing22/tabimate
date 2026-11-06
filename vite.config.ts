import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Shared with vitest.config.ts; mirrors "paths" in tsconfig.json.
export const alias = {
  '@': fileURLToPath(new URL('./src', import.meta.url)),
};

export default defineConfig({
  resolve: { alias },
});
