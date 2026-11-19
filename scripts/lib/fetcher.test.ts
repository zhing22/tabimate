import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFetcher, userAgent } from './fetcher';

const dirs: string[] = [];
const tempDir = () => {
  const dir = mkdtempSync(join(tmpdir(), 'fetcher-'));
  dirs.push(dir);
  return dir;
};
afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

const ok = (data: unknown) => new Response(JSON.stringify(data), { status: 200 });

describe('createFetcher', () => {
  it('caches responses on disk, so a repeat costs no request', async () => {
    const fetch = vi.fn(() => Promise.resolve(ok({ n: 1 })));
    const dir = tempDir();
    const a = createFetcher({ cacheDir: dir, intervalMs: 0, fetch });
    expect(await a.json('https://x/1')).toEqual({ n: 1 });
    expect(await a.json('https://x/1')).toEqual({ n: 1 });
    // A new fetcher on the same cache (a rerun) also hits the cache.
    const b = createFetcher({ cacheDir: dir, intervalMs: 0, fetch });
    expect(await b.json('https://x/1')).toEqual({ n: 1 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('waits out the interval between network requests', async () => {
    let clock = 0;
    const waits: number[] = [];
    const fetcher = createFetcher({
      cacheDir: tempDir(),
      intervalMs: 1000,
      fetch: () => Promise.resolve(ok({})),
      now: () => clock,
      sleep: (ms) => {
        waits.push(ms);
        clock += ms;
        return Promise.resolve();
      },
    });
    await fetcher.json('https://x/a');
    clock += 300;
    await fetcher.json('https://x/b');
    expect(waits).toEqual([700]);
    expect(fetcher.requests()).toBe(2);
  });

  it('sends a descriptive User-Agent, a form body as POST, and maps 404 to null', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(() =>
      Promise.resolve(new Response('', { status: 404 })),
    );
    const fetcher = createFetcher({ cacheDir: tempDir(), intervalMs: 0, fetch });
    expect(await fetcher.json('https://x/q', { query: 'ASK {}' })).toBeNull();
    const init = fetch.mock.calls[0]![1]!;
    expect(init.method).toBe('POST');
    expect(init.body).toBe('query=ASK+%7B%7D');
    expect((init.headers as Record<string, string>)['User-Agent']).toMatch(
      /^TabimateContentScripts/,
    );
  });

  it('adds contact details to the User-Agent only when given', () => {
    expect(userAgent('')).not.toContain(';');
    expect(userAgent('me@example.org')).toContain('; me@example.org');
  });
});

describe('createFetcher: rate limits', () => {
  it('retries a 429, waiting as Retry-After says, then backing off', async () => {
    const responses = [
      new Response('', { status: 429, headers: { 'Retry-After': '3' } }),
      new Response('', { status: 503 }),
      ok({ done: true }),
    ];
    const waits: number[] = [];
    const fetcher = createFetcher({
      cacheDir: tempDir(),
      intervalMs: 0,
      fetch: () => Promise.resolve(responses.shift()!),
      sleep: (ms) => {
        waits.push(ms);
        return Promise.resolve();
      },
    });
    expect(await fetcher.json('https://x/busy')).toEqual({ done: true });
    expect(waits).toEqual([3000, 10000]);
    expect(fetcher.requests()).toBe(3);
  });
});
