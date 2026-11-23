import { describe, expect, it, vi } from 'vitest';
import { STATS } from '@/config/stats';
import type { RunSubmission } from '@/core/stats';
import { deviceId } from '@/services/deviceId';
import { createMemoryStorageAdapter } from '@/services/storage';
import { createApiStatsSource, nullStatsSource } from './statsSource';

const RUN: RunSubmission = {
  deviceId: '0f8fad5b-d9cb-469f-a165-70867728950e',
  dateKey: '2026-11-23',
  answers: [{ promptId: 'p1', answerId: 'tiger' }],
};
const STATS_BODY = {
  dateKey: '2026-11-23',
  prompts: { p1: { players: 30, answers: { tiger: 3 } } },
};

function setup(respond: (url: string, init?: RequestInit) => Promise<Response>) {
  const storage = createMemoryStorageAdapter();
  const fetch = vi.fn((url: string, init?: RequestInit) => respond(url, init));
  const source = createApiStatsSource({
    baseUrl: 'https://tabimate.test/',
    storage,
    fetch,
  });
  return { storage, fetch, source };
}

const ok = (body?: unknown) =>
  Promise.resolve(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status: body === undefined ? 204 : 200,
    }),
  );

describe('api stats source', () => {
  it('posts a run as JSON to the API', async () => {
    const t = setup(() => ok());
    await t.source.submitRun(RUN);
    const [url, init] = t.fetch.mock.calls[0]!;
    expect(url).toBe(`https://tabimate.test/${STATS.apiPath}`);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual(RUN);
    expect(t.storage.get(STATS.pendingKey)).toBeNull();
  });

  it('keeps a run that failed to send, and tries it once more on the next launch', async () => {
    const t = setup(() => Promise.reject(new TypeError('offline')));
    await t.source.submitRun(RUN);
    expect(t.storage.get(STATS.pendingKey)).toEqual(RUN);
    await t.source.retryPending(); // fails again: dropped all the same
    expect(t.fetch).toHaveBeenCalledTimes(2);
    expect(t.storage.get(STATS.pendingKey)).toBeNull();
    await t.source.retryPending();
    expect(t.fetch).toHaveBeenCalledTimes(2);
  });

  it("drops a run the server refused (it would never take it), but keeps one the server couldn't", async () => {
    const refused = setup(() => Promise.resolve(new Response('{}', { status: 400 })));
    await refused.source.submitRun(RUN);
    expect(refused.storage.get(STATS.pendingKey)).toBeNull();
    const down = setup(() => Promise.resolve(new Response('', { status: 503 })));
    await down.source.submitRun(RUN);
    expect(down.storage.get(STATS.pendingKey)).toEqual(RUN);
  });

  it("reads a day's stats, and gives null for an error or a body of the wrong shape", async () => {
    const good = setup(() => ok(STATS_BODY));
    expect(await good.source.getDayStats('2026-11-23')).toEqual(STATS_BODY);
    expect(good.fetch.mock.calls[0]![0]).toContain('?date=2026-11-23');
    const odd = setup(() => ok({ dateKey: 'x', prompts: { p1: { players: 'many' } } }));
    expect(await odd.source.getDayStats('2026-11-23')).toBeNull();
    const failing = setup(() => Promise.reject(new Error('timeout')));
    expect(await failing.source.getDayStats('2026-11-23')).toBeNull();
  });

  it('the null source sends nothing and never has stats', async () => {
    await nullStatsSource.submitRun(RUN);
    expect(await nullStatsSource.getDayStats('2026-11-23')).toBeNull();
  });
});

describe('deviceId', () => {
  it('makes a random id once and keeps it', () => {
    const storage = createMemoryStorageAdapter();
    const random = vi.fn(() => '0f8fad5b-d9cb-469f-a165-70867728950e');
    expect(deviceId(storage, random)).toBe(RUN.deviceId);
    expect(deviceId(storage, random)).toBe(RUN.deviceId);
    expect(random).toHaveBeenCalledOnce();
  });

  it('replaces a stored value that is not a UUID', () => {
    const storage = createMemoryStorageAdapter();
    storage.set(STATS.deviceKey, 'someone@example.com');
    expect(deviceId(storage, () => RUN.deviceId)).toBe(RUN.deviceId);
  });
});
