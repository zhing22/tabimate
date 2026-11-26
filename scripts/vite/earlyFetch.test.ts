import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { EARLY_FETCH_GLOBAL } from '@/config/data';
import { RESET_HOUR, TIMEZONE } from '@/config/game';
import { dailyKey } from '@/core/date';
import { ANIMALS_FILE, puzzleFile } from '@/data/localPuzzleSource';
import { dailyKeySource, earlyFetchScript } from './earlyFetch';

/** The generated key function, run as the browser would: plain script, no imports. */
const inlineKey = runInNewContext(`(function (now) {${dailyKeySource(TIMEZONE, RESET_HOUR)}})`, {
  Intl,
  Date,
}) as (now: Date) => string;

/** Runs the inline script with a fake fetch and location; returns what it fetched. */
function run(search: string) {
  const fetched: string[] = [];
  const window: Record<string, unknown> = {};
  const fetch = (url: string) => {
    fetched.push(url);
    return Promise.resolve(new Response('{}'));
  };
  const sandbox = { window, location: { search }, fetch, URLSearchParams, Intl, Date };
  runInNewContext(earlyFetchScript('/'), sandbox);
  return { fetched, early: window[EARLY_FETCH_GLOBAL] as Record<string, unknown> };
}

describe('the early fetch in index.html', () => {
  it("works out the same puzzle key as core/date.ts, around every day's reset", () => {
    const start = Date.UTC(2026, 10, 20, 0, 0);
    for (let minutes = 0; minutes < 4 * 24 * 60; minutes += 17) {
      const now = new Date(start + minutes * 60_000);
      expect(inlineKey(now)).toBe(dailyKey(now));
    }
    // Either side of noon in Singapore (04:00 UTC).
    expect(inlineKey(new Date('2026-11-26T03:59:00Z'))).toBe('2026-11-25');
    expect(inlineKey(new Date('2026-11-26T04:00:00Z'))).toBe('2026-11-26');
  });

  it("fetches today's puzzle and the animals, at the loader's own URLs", () => {
    vi.useFakeTimers({ now: new Date('2026-11-26T05:00:00Z') });
    const { fetched, early } = run('');
    vi.useRealTimers();
    expect(fetched).toEqual([`/${puzzleFile('2026-11-26')}`, `/${ANIMALS_FILE}`]);
    expect(Object.keys(early)).toEqual(fetched);
  });

  it('fetches the debug date instead, only with debug on', () => {
    expect(run('?debug=1&date=2026-11-01').fetched[0]).toBe(`/${puzzleFile('2026-11-01')}`);
    expect(run('?date=2026-11-01').fetched[0]).not.toBe(`/${puzzleFile('2026-11-01')}`);
  });
});
