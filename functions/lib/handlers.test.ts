import { describe, expect, it, vi } from 'vitest';
import { STATS } from '../../src/config/stats';
import { getDayStats, postRun, type RunsDeps } from './handlers';
import { cachedDayStats, type StatsCache } from './statsCache';

const TODAY = '2026-11-23';
const SITE = 'https://tabimate.test';
const PUZZLE = { prompts: [{ id: 'p1', answers: [{ animalId: 'tiger', level: 4 }] }] };
const RUN = {
  deviceId: '0f8fad5b-d9cb-469f-a165-70867728950e',
  dateKey: TODAY,
  answers: [{ promptId: 'p1', answerId: 'tiger' }],
};

/** A stand-in D1: records what is run, answers the stats query with `rows`. */
function fakeDb(rows: unknown[] = []) {
  const batches: { sql: string; params: unknown[] }[][] = [];
  const prepare = (sql: string) => ({
    bind: (...params: unknown[]) => ({
      sql,
      params,
      all: () => Promise.resolve({ results: rows }),
    }),
  });
  const db = {
    prepare,
    batch: (statements: { sql: string; params: unknown[] }[]) => {
      batches.push(statements);
      return Promise.resolve([]);
    },
  };
  return { db: db as unknown as D1Database, batches };
}

function setup(over: Partial<RunsDeps> = {}) {
  const fake = fakeDb([{ prompt_id: 'p1', answer_id: 'tiger', n: 2 }]);
  const deps: RunsDeps = {
    db: fake.db,
    loadPuzzle: (date) => Promise.resolve(date === TODAY ? PUZZLE : null),
    now: () => new Date('2026-11-23T06:00:00Z'),
    origin: SITE,
    ...over,
  };
  return { deps, batches: fake.batches };
}

const post = (body: BodyInit, headers: Record<string, string> = {}) =>
  new Request(`${SITE}/api/runs`, { method: 'POST', body, headers });

describe('postRun', () => {
  it('stores a run from this site, or from a client that sends no Origin', async () => {
    const t = setup();
    expect((await postRun(post(JSON.stringify(RUN), { origin: SITE }), t.deps)).status).toBe(204);
    expect((await postRun(post(JSON.stringify(RUN)), t.deps)).status).toBe(204);
    // The puzzle file's level is stored, then the time.
    expect(t.batches[0]![0]!.params.slice(0, 5)).toEqual([RUN.deviceId, TODAY, 'p1', 'tiger', 4]);
  });

  it('refuses a run posted from another site', async () => {
    const t = setup();
    const response = await postRun(
      post(JSON.stringify(RUN), { origin: 'https://evil.test' }),
      t.deps,
    );
    expect(response.status).toBe(403);
    expect(t.batches).toEqual([]);
  });

  it('refuses a body that says it is too big before reading it, and one that is', async () => {
    const t = setup();
    const declared = post('{}', { 'content-length': String(STATS.maxBodyBytes + 1) });
    expect((await postRun(declared, t.deps)).status).toBe(413);
    // Counted in bytes: each "é" is two, so this is under the limit in characters but over in bytes.
    const wide = JSON.stringify({ ...RUN, pad: 'é'.repeat(STATS.maxBodyBytes / 2 + 10) });
    expect(wide.length).toBeLessThan(STATS.maxBodyBytes * 2);
    expect((await postRun(post(wide), t.deps)).status).toBe(413);
  });

  it('refuses a body that is not JSON, and a run for a day with no puzzle file', async () => {
    const t = setup();
    expect((await postRun(post('{not json'), t.deps)).status).toBe(400);
    const noFile = setup({ loadPuzzle: () => Promise.resolve(null) });
    const response = await postRun(post(JSON.stringify(RUN)), noFile.deps);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: `no puzzle for ${TODAY}` });
  });
});

describe('getDayStats', () => {
  it("answers a day's counts, cacheable for a minute", async () => {
    const response = await getDayStats(new URL(`${SITE}/api/runs?date=${TODAY}`), setup().deps);
    expect(response.headers.get('cache-control')).toBe(`public, max-age=${STATS.cacheSeconds}`);
    expect(await response.json()).toEqual({
      dateKey: TODAY,
      prompts: { p1: { players: 2, answers: { tiger: 2 } } },
    });
  });
});

describe('cachedDayStats', () => {
  const fakeCache = () => {
    const store = new Map<string, Response>();
    const cache: StatsCache = {
      match: (key) => Promise.resolve(store.get(key.url)?.clone()),
      put: (key, response) => {
        store.set(key.url, response);
        return Promise.resolve();
      },
    };
    return { cache, store };
  };
  const waitUntil = (work: Promise<unknown>) => void work;

  it('keys the cache on the date alone, so extra parameters still hit it', async () => {
    const { cache, store } = fakeCache();
    const load = vi.fn(() => Promise.resolve(new Response('{}')));
    await cachedDayStats(new URL(`${SITE}/api/runs?date=${TODAY}`), cache, waitUntil, load);
    await cachedDayStats(new URL(`${SITE}/api/runs?date=${TODAY}&x=1`), cache, waitUntil, load);
    expect(load).toHaveBeenCalledOnce();
    expect([...store.keys()]).toEqual([`${SITE}/api/runs?date=${TODAY}`]);
  });

  it('never caches a bad date or a failed answer', async () => {
    const { cache, store } = fakeCache();
    const bad = vi.fn(() => Promise.resolve(new Response('{}', { status: 400 })));
    await cachedDayStats(new URL(`${SITE}/api/runs?date=today`), cache, waitUntil, bad);
    await cachedDayStats(new URL(`${SITE}/api/runs?date=${TODAY}`), cache, waitUntil, bad);
    expect(store.size).toBe(0);
  });
});
