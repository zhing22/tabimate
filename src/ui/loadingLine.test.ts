// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { loadingLine, loadingText, LOADING_TEXT } from './loadingLine';

describe('loadingLine', () => {
  it('names the theme, or keeps the plain text', () => {
    expect(loadingText({ name: 'Fishy Friday' })).toBe('Packing your bag for Fishy Friday…');
    expect(loadingText(null)).toBe(LOADING_TEXT);
  });

  it('updates the .loading line if it is there, and does nothing if not', () => {
    const root = document.createElement('main');
    root.innerHTML = `<p class="loading">${LOADING_TEXT}</p>`;
    loadingLine({ name: 'Sunday Deep Dive' }, root);
    expect(root.textContent).toBe('Packing your bag for Sunday Deep Dive…');
    expect(() => loadingLine(null, document.createElement('main'))).not.toThrow();
  });

  it('matches the static line in index.html, so nothing jumps on a plain day', async () => {
    const { readFileSync } = await import('node:fs');
    expect(readFileSync('index.html', 'utf8')).toContain(`<p class="loading">${LOADING_TEXT}</p>`);
  });
});
