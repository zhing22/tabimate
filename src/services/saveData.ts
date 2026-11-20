import type { UnlockedAchievement } from '@/core/achievements/registry';
import type { Journal } from '@/core/journal/journal';
import { emptyStats, type Stats } from '@/core/streak';
import type { DateKey, RunState } from '@/core/types';
import { readCollection } from './collectionGuards';
import { MIGRATIONS, type Migration } from './migrations';
import { isObject, isRunState, readStats } from './saveGuards';

export { MIGRATIONS, type Migration } from './migrations';

/** The one storage key all progress lives under. */
export const SAVE_KEY = 'tabimate.save';

/** Where an unreadable save is copied before it is written over, so it can be recovered. */
export const BACKUP_KEY = 'tabimate.save.bak';

/**
 * Bump when the shape changes, and add a migration from the old version
 * (migrations.ts). Saves key journal entries and runs by animal id, so renaming
 * or merging an animal id in animals.json also needs a migration that moves
 * them; without one, old finds drop out of every set. (validate-data already
 * fails if an id used by any puzzle file, released ones included, disappears.)
 */
export const SCHEMA_VERSION = 4;

export interface SaveData {
  readonly version: number;
  /** Full state of recent runs, keyed by puzzle date. */
  readonly runs: Readonly<Record<DateKey, RunState>>;
  readonly stats: Stats;
  /** The Field Journal: every animal ever found (v3). */
  readonly journal: Journal;
  /** Achievements unlocked, each with the puzzle that unlocked it (v3). */
  readonly achievements: readonly UnlockedAchievement[];
}

type Json = Record<string, unknown>;

export const emptySaveData = (): SaveData => ({
  version: SCHEMA_VERSION,
  runs: {},
  stats: emptyStats(),
  journal: {},
  achievements: [],
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

/** Valid runs, keyed by their own date; anything else is dropped (lossy). */
function readRuns(value: unknown): { runs: Record<DateKey, RunState>; lossy: boolean } {
  let lossy = value !== undefined && !isObject(value);
  const runs: Record<DateKey, RunState> = {};
  for (const [key, run] of Object.entries(isObject(value) ? value : {})) {
    if (isRunState(run) && run.puzzleDate === key) runs[key] = run;
    else lossy = true;
  }
  return { runs, lossy };
}

/**
 * Turns whatever storage held into valid SaveData, salvaging piece by piece:
 * a bad run loses that run, a bad history or journal entry loses that entry.
 * `lossy` is true if anything stored could not be kept, so the caller can
 * back it up before writing over it.
 */
export function readSaveData(
  raw: unknown,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
  target = SCHEMA_VERSION,
): { data: SaveData; lossy: boolean } {
  if (raw === null || raw === undefined) return { data: emptySaveData(), lossy: false };
  const data = migrate(raw, migrations, target);
  if (!data) return { data: emptySaveData(), lossy: true };
  const runs = readRuns(data.runs);
  const stats = readStats(data.stats);
  const collection = readCollection(data.journal, data.achievements);
  return {
    data: { version: target, runs: runs.runs, stats: stats.stats, ...collection.collection },
    lossy: runs.lossy || stats.lossy || collection.lossy,
  };
}

/** readSaveData without the report. */
export const parseSaveData = (
  raw: unknown,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
  target = SCHEMA_VERSION,
): SaveData => readSaveData(raw, migrations, target).data;
