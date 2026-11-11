import { defineConfig } from 'vitest/config';
import { alias } from './vite.config.ts';

// Node by default keeps core tests honest (no DOM). UI tests opt in to jsdom
// with a `// @vitest-environment jsdom` comment at the top of the file.
export default defineConfig({
  resolve: { alias },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    passWithNoTests: true,
    // So tests can read stylesheets with ?raw (ui/styles.test.ts checks the tokens).
    css: true,
  },
});
