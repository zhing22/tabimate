import { emptyStats, type Stats } from '@/core/streak';
import type { DateKey, RunState } from '@/core/types';
import { isObject, isRunState, isStats } from './saveGuards';

/** The one storage key all progress lives under. */
export const SAVE_KEY = 'tabimate.save';

/** Bump when the shape changes, and add a migration from the old version. */
export const SCHEMA_VERSION = 1;

export interface SaveData {
  readonly version: number;
  /** Full state of recent runs, keyed by puzzle date. */
  readonly runs: Readonly<Record<DateKey, RunState>>;
  readonly stats: Stats;
}

type Json = Record<string, unknown>;
export type Migration = (data: Json) => Json;

/**
 * MIGRATIONS[n] turns version n data into version n + 1. To change the shape:
 * bump SCHEMA_VERSION and add an entry here; old saves are upgraded on load.
 */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {};

export const emptySaveData = (): SaveData => ({
  version: SCHEMA_VERSION,
  runs: {},
  stats: emptyStats(),
});

/** True for data written by a newer build than this one (e.g. after a rollback). */
export const isFromNewerVersion = (raw: unknown, current = SCHEMA_VERSION): boolean =>
  isObject(raw) && typeof raw.version === 'number' && raw.version > current;

/**
 * Upgrades raw stored data one version at a time up to `target`. Null when it
 * cannot: not an object, no version, a missing step, or newer than target.
 */
export function migrate(
  raw: unknown,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
  target = SCHEMA_VERSION,
): Json | null {
  if (!isObject(raw) || !Number.isInteger(raw.version)) return null;
  let data = raw;
  let version = Number(raw.version);
  if (version > target) return null;
  while (version < target) {
    const step = migrations[version];
    if (!step) return null;
    data = { ...step(data), version: version + 1 };
    version++;
  }
  return data;
}

/**
 * Turns whatever storage held into valid SaveData. Unreadable parts are
 * dropped, not fatal: a bad run loses that run, bad stats reset the stats.
 */
export function parseSaveData(
  raw: unknown,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
  target = SCHEMA_VERSION,
): SaveData {
  const data = migrate(raw, migrations, target);
  if (!data) return emptySaveData();
  const runs: Record<DateKey, RunState> = {};
  if (isObject(data.runs)) {
    for (const [key, run] of Object.entries(data.runs)) {
      if (isRunState(run) && run.puzzleDate === key) runs[key] = run;
    }
  }
  return {
    version: target,
    runs,
    stats: isStats(data.stats) ? data.stats : emptyStats(),
  };
}
