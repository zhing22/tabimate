import { describe, expect, it } from 'vitest';
import {
  emptySaveData,
  isFromNewerVersion,
  migrate,
  parseSaveData,
  SCHEMA_VERSION,
  type Migration,
} from './saveData';
import { finishedRun, playingRun } from './testRuns';

// A made-up history of shapes, to test the migration chain itself:
// v1 had `best`, v2 renamed it to `bestScore`, v3 added `seen`.
const chain: Record<number, Migration> = {
  1: ({ best, ...rest }) => ({ ...rest, bestScore: best }),
  2: (data) => ({ ...data, seen: [] }),
};

describe('migrate', () => {
  it('upgrades one version at a time to the target', () => {
    expect(migrate({ version: 1, best: 9 }, chain, 3)).toEqual({
      version: 3,
      bestScore: 9,
      seen: [],
    });
    expect(migrate({ version: 2, bestScore: 4 }, chain, 3)).toEqual({
      version: 3,
      bestScore: 4,
      seen: [],
    });
  });

  it('leaves current data alone', () => {
    expect(migrate({ version: 3, x: 1 }, chain, 3)).toEqual({ version: 3, x: 1 });
  });

  it.each<[string, unknown]>([
    ['not an object', 'hello'],
    ['no version', { runs: {} }],
    ['a missing step', { version: 0 }],
    ['a newer version', { version: 4 }],
  ])('gives up on %s', (_name, raw) => {
    expect(migrate(raw, chain, 3)).toBeNull();
  });
});

describe('parseSaveData', () => {
  it('reads back what was saved', () => {
    const data = {
      ...emptySaveData(),
      runs: { '2026-11-07': finishedRun('2026-11-07') },
      stats: {
        streak: 1,
        bestStreak: 1,
        lastPlayedKey: '2026-11-07',
        history: [{ key: '2026-11-07', score: 25, tiers: [2, 0, 0] }],
      },
    };
    expect(parseSaveData(JSON.parse(JSON.stringify(data)))).toEqual(data);
  });

  it.each<[string, unknown]>([
    ['nothing saved', null],
    ['garbage', 'x'],
    ['a newer build', { version: SCHEMA_VERSION + 1, runs: {} }],
  ])('starts fresh from %s', (_name, raw) => {
    expect(parseSaveData(raw)).toEqual(emptySaveData());
  });

  it('drops a bad run but keeps the good ones and the stats', () => {
    const good = playingRun('2026-11-08');
    const raw = {
      version: SCHEMA_VERSION,
      runs: {
        '2026-11-07': { ...finishedRun('2026-11-07'), status: 'won' },
        '2026-11-08': good,
        '2026-11-09': playingRun('2026-11-01'), // filed under the wrong date
      },
      stats: { streak: 2, bestStreak: 2, lastPlayedKey: '2026-11-06', history: [] },
    };
    const data = parseSaveData(raw);
    expect(data.runs).toEqual({ '2026-11-08': good });
    expect(data.stats.streak).toBe(2);
  });

  it('resets only the stats when they are broken', () => {
    const raw = {
      version: SCHEMA_VERSION,
      runs: { '2026-11-07': finishedRun('2026-11-07') },
      stats: { streak: -1 },
    };
    const data = parseSaveData(raw);
    expect(data.stats).toEqual(emptySaveData().stats);
    expect(Object.keys(data.runs)).toEqual(['2026-11-07']);
  });

  it('upgrades old saves through the migrations it is given', () => {
    const v0 = { version: 0, runs: {}, stats: { streak: 4, best: 6, last: null, history: [] } };
    const toV1: Record<number, Migration> = {
      0: ({ stats, ...rest }) => {
        const { best, last, ...kept } = stats as Record<string, unknown>;
        return { ...rest, stats: { ...kept, bestStreak: best, lastPlayedKey: last } };
      },
    };
    expect(parseSaveData(v0, toV1, 1).stats).toEqual({
      streak: 4,
      bestStreak: 6,
      lastPlayedKey: null,
      history: [],
    });
  });
});

describe('isFromNewerVersion', () => {
  it('spots data from a newer build only', () => {
    expect(isFromNewerVersion({ version: SCHEMA_VERSION + 1 })).toBe(true);
    expect(isFromNewerVersion({ version: SCHEMA_VERSION })).toBe(false);
    expect(isFromNewerVersion(null)).toBe(false);
  });
});
