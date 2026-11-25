// Runs before every test file (vitest.config.ts setupFiles). UI screens mark
// <html> (the layout, a full-screen page, typing), and jsdom keeps one
// document per file: start each test from a clean <html>.
import { afterEach } from 'vitest';

afterEach(() => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.className = '';
  delete root.dataset['layout'];
});
