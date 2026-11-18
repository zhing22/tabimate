import { emptyStats, type Stats } from '@/core/streak';
import type { DateKey, RunState } from '@/core/types';
import { isObject, isRunState, readStats } from './saveGuards';

/** The one storage key all progress lives under. */
export const SAVE_KEY = 'tabimate.save';

/** Where an unreadable save is copied before it is written over, so it can be recovered. */
export const BACKUP_KEY = 'tabimate.save.bak';

/** Bump when the shape changes, and add a migration from the old version. */
export const SCHEMA_VERSION = 2;

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
/** Renames a key on a plain object, leaving anything else untouched. */
function renameKey(value: unknown, from: string, to: string): unknown {
  if (!isObject(value) || !(from in value)) return value;
  const { [from]: moved, ...rest } = value;
  return { ...rest, [to]: moved };
}

/** v1 to v2: tiers became levels (match.tier to match.level, history tiers to levels). */
function tiersToLevels(data: Json): Json {
  const runs = isObject(data.runs)
    ? Object.fromEntries(
        Object.entries(data.runs).map(([key, run]) => [
          key,
          isObject(run) && Array.isArray(run.results)
            ? {
                ...run,
                results: run.results.map((r: unknown) =>
                  isObject(r) ? { ...r, match: renameKey(r.match, 'tier', 'level') } : r,
                ),
              }
            : run,
        ]),
      )
    : data.runs;
  const stats =
    isObject(data.stats) && Array.isArray(data.stats.history)
      ? {
          ...data.stats,
          history: data.stats.history.map((e: unknown) => renameKey(e, 'tiers', 'levels')),
        }
      : data.stats;
  return { ...data, runs, stats };
}

export const MIGRATIONS: Readonly<Record<number, Migration>> = { 1: tiersToLevels };

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
 * Turns whatever storage held into valid SaveData, salvaging piece by piece:
 * a bad run loses that run, a bad history entry loses that entry. `lossy` is
 * true if anything stored could not be kept, so the caller can back it up
 * before writing over it.
 */
export function readSaveData(
  raw: unknown,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
  target = SCHEMA_VERSION,
): { data: SaveData; lossy: boolean } {
  if (raw === null || raw === undefined) return { data: emptySaveData(), lossy: false };
  const data = migrate(raw, migrations, target);
  if (!data) return { data: emptySaveData(), lossy: true };

  let lossy = false;
  const runs: Record<DateKey, RunState> = {};
  if (data.runs !== undefined && !isObject(data.runs)) lossy = true;
  for (const [key, run] of Object.entries(isObject(data.runs) ? data.runs : {})) {
    if (isRunState(run) && run.puzzleDate === key) runs[key] = run;
    else lossy = true;
  }
  const stats = readStats(data.stats);
  return { data: { version: target, runs, stats: stats.stats }, lossy: lossy || stats.lossy };
}

/** readSaveData without the report. */
export const parseSaveData = (
  raw: unknown,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
  target = SCHEMA_VERSION,
): SaveData => readSaveData(raw, migrations, target).data;
