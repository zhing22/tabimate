import { defineConfig } from 'vitest/config';
import { alias } from './vite.config.ts';

// Node by default keeps core tests honest (no DOM). UI tests opt in to jsdom
// with a `// @vitest-environment jsdom` comment at the top of the file.
export default defineConfig({
  resolve: { alias },
  test: {
    environment: 'node',
    // Worker threads, not child processes (Vitest's default "forks"): some
    // sandboxed environments restrict child processes, and every file then
    // fails at its first describe ("reading 'config'"). Not "vmThreads": its
    // per-file VM contexts make the matcher ~40x slower than real use, which
    // the matcher's speed test would wrongly flag.
    pool: 'threads',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts', 'functions/**/*.test.ts'],
    passWithNoTests: true,
    setupFiles: ['src/testSetup.ts'],
    // So tests can read stylesheets with ?raw (ui/styles.test.ts checks the tokens).
    css: true,
  },
});
