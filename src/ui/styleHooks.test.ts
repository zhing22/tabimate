// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { LEVELS } from '@/config/levels';
import { levelBadge } from './components/levelBadge';

// Class names and custom properties are plain strings, so renaming one side
// (TypeScript or CSS) leaves the other silently unstyled. These tests tie them.
const sheets = Object.values(
  import.meta.glob<string>('./styles/*.css', { query: '?raw', import: 'default', eager: true }),
).join('\n');
const sources = import.meta.glob<string>(['./**/*.ts', '!./**/*.test.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

const hasRule = (cls: string) => new RegExp(`\\.${cls}(?![\\w-])`).test(sheets);
const isRead = (prop: string) => new RegExp(`var\\(\\s*${prop}(?![\\w-])`).test(sheets);

describe('style hooks', () => {
  it('every class a level badge carries has a CSS rule', () => {
    const classes = new Set<string>();
    for (const { id } of LEVELS) {
      for (const size of ['sm', 'lg'] as const) {
        for (const compact of [false, true]) {
          levelBadge(id, { size, compact }).el.classList.forEach((c) => classes.add(c));
        }
      }
    }
    expect([...classes].sort()).toEqual(['level-badge', 'level-badge--lg']);
    for (const cls of classes) expect(hasRule(cls), `.${cls} has no rule`).toBe(true);
  });

  it('every custom property the UI sets is read by a style sheet', () => {
    const set = new Set<string>();
    for (const source of Object.values(sources)) {
      for (const [, style] of source.matchAll(/style:\s*`([^`]*)`/g)) {
        for (const [prop] of style!.matchAll(/--[\w-]+(?=\s*:)/g)) set.add(prop);
      }
      for (const [, prop] of source.matchAll(/setProperty\(\s*'(--[\w-]+)'/g)) set.add(prop!);
    }
    // The scan must find the hooks it exists for, or it would pass vacuously.
    expect(set).toContain('--reveal-level');
    expect(set).toContain('--badge');
    for (const prop of set) expect(isRead(prop), `${prop} is set but never read`).toBe(true);
  });
});
