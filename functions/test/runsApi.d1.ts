// The runs API against a real (local, in-memory) D1 from Wrangler: the
// migration, INSERT OR IGNORE, and the stats query, end to end.
//
//   npm run test:d1
//
// On Node's own test runner, not Vitest: Wrangler's local runtime needs a
// plain Node process (Vitest's VM pool breaks its file checks).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';
import { getPlatformProxy } from 'wrangler';
import { getDayStats, postRun, type RunsDeps } from '../lib/handlers.ts';

const TODAY = '2026-11-23';
const NOW = new Date('2026-11-23T06:00:00Z'); // 14:00 SGT: puzzle 2026-11-23 is live
const PUZZLE = {
  date: TODAY,
  prompts: [
    {
      id: 'p1',
      answers: [
        { animalId: 'tiger', level: 4 },
        { animalId: 'lion', level: 1 },
      ],
    },
    { id: 'p2', answers: [{ animalId: 'koala', level: 2 }] },
  ],
};
const device = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const post = (deps: RunsDeps, body: unknown) =>
  postRun(
    new Request('https://x.test/api/runs', { method: 'POST', body: JSON.stringify(body) }),
    deps,
  );
const run = (n: number, p1: string | null) => ({
  deviceId: device(n),
  dateKey: TODAY,
  answers: [
    { promptId: 'p1', answerId: p1 },
    { promptId: 'p2', answerId: 'koala' },
  ],
});

let proxy: Awaited<ReturnType<typeof getPlatformProxy<{ DB: D1Database }>>>;
let deps: RunsDeps;

before(async () => {
  proxy = await getPlatformProxy<{ DB: D1Database }>({ persist: false });
  const db = proxy.env.DB;
  // The real migration, one statement at a time.
  const migration = readFileSync('migrations/0001_runs.sql', 'utf8').replace(/--.*$/gm, '');
  for (const sql of migration.split(';').map((s) => s.trim())) if (sql) await db.prepare(sql).run();
  deps = {
    db,
    loadPuzzle: (date) => Promise.resolve(date === TODAY ? PUZZLE : null),
    now: () => NOW,
  };
});

after(async () => {
  await proxy.dispose();
});

void describe('runs API on local D1', () => {
  void it('stores runs once per device and counts them per prompt and answer', async () => {
    assert.equal((await post(deps, run(1, 'tiger'))).status, 204);
    assert.equal((await post(deps, run(2, 'lion'))).status, 204);
    assert.equal((await post(deps, run(3, null))).status, 204);
    // The same device again, with a different answer: the first one stands.
    assert.equal((await post(deps, run(1, 'lion'))).status, 204);

    const response = await getDayStats(new URL(`https://x.test/api/runs?date=${TODAY}`), deps);
    assert.match(response.headers.get('cache-control') ?? '', /max-age=60/);
    assert.deepEqual(await response.json(), {
      dateKey: TODAY,
      prompts: {
        p1: { players: 3, answers: { tiger: 1, lion: 1 } },
        p2: { players: 3, answers: { koala: 3 } },
      },
    });
  });

  void it('refuses a tampered answer and stores nothing of it', async () => {
    const bad = {
      deviceId: device(9),
      dateKey: TODAY,
      answers: [{ promptId: 'p2', answerId: 'tiger' }],
    };
    assert.equal((await post(deps, bad)).status, 400);
    const { results } = await deps.db
      .prepare('SELECT * FROM runs WHERE device_id = ?')
      .bind(device(9))
      .all();
    assert.deepEqual(results, []);
  });

  void it('refuses a body too big to be a run, and a bad date query', async () => {
    const huge = { deviceId: device(8), dateKey: TODAY, answers: [], pad: 'x'.repeat(5000) };
    assert.equal((await post(deps, huge)).status, 413);
    const bad = await getDayStats(new URL('https://x.test/api/runs?date=today'), deps);
    assert.equal(bad.status, 400);
  });
});
