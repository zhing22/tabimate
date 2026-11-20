// Save migrations: MIGRATIONS[n] turns version n data into version n + 1. To
// change the save's shape, bump SCHEMA_VERSION (saveData.ts) and add an entry;
// old saves are upgraded on load. Each step works on raw JSON, defensively.
import { journalFromRuns } from './collectionGuards';
import type { RunState } from '@/core/types';
import { isObject, isRunState } from './saveGuards';

type Json = Record<string, unknown>;
export type Migration = (data: Json) => Json;

/**
 * A run as the current guard expects it, for migrations that check runs:
 * saves from before v5 have no bonus fields, and would otherwise all fail
 * isRunState and be lost. Migration 4 writes these defaults for good.
 */
const withBonusDefaults = (run: unknown): unknown =>
  isObject(run) ? { bonusCount: 0, bonusResults: [], bonusEndsAt: null, ...run } : run;

const isOldRun = (run: unknown): run is RunState => isRunState(withBonusDefaults(run));

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

/**
 * v2 to v3: the Field Journal and achievements. The journal is back-filled
 * from the finished runs the save still holds (RUNS_KEPT_DAYS of them; older
 * history keeps only levels, not which animals). Achievements start empty and
 * unlock on the next finished run, which checks the whole history.
 */
function addCollection(data: Json): Json {
  const runs = isObject(data.runs)
    ? Object.values(data.runs).map(withBonusDefaults).filter(isOldRun)
    : [];
  return { ...data, journal: journalFromRuns(runs), achievements: [] };
}

/**
 * v3 to v4: history entries name each prompt's animal (for the history
 * screen's team), back-filled from the finished runs still saved; older days
 * keep levels only. Stats gain streak freezes: none held, none used yet.
 */
function addHistoryAnimals(data: Json): Json {
  if (!isObject(data.stats)) return data;
  const runs = isObject(data.runs) ? data.runs : {};
  const history = Array.isArray(data.stats.history)
    ? data.stats.history.map((entry: unknown) => {
        if (!isObject(entry) || typeof entry.key !== 'string') return entry;
        const run = runs[entry.key];
        if (!isOldRun(run) || run.status !== 'finished') return entry;
        return { ...entry, animalIds: run.results.map((r) => r.match.animalId) };
      })
    : data.stats.history;
  return { ...data, stats: { ...data.stats, history, freezes: 0, frozenKeys: [] } };
}

/**
 * v4 to v5: the bonus quiz. Runs gain bonusCount 0 and no bonus results (no
 * day had a quiz before); history entries gain base, equal to their score.
 */
function addBonus(data: Json): Json {
  const runs = isObject(data.runs)
    ? Object.fromEntries(Object.entries(data.runs).map(([k, run]) => [k, withBonusDefaults(run)]))
    : data.runs;
  const stats =
    isObject(data.stats) && Array.isArray(data.stats.history)
      ? {
          ...data.stats,
          history: data.stats.history.map((e: unknown) =>
            isObject(e) && e.base === undefined ? { ...e, base: e.score } : e,
          ),
        }
      : data.stats;
  return { ...data, runs, stats };
}

export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  1: tiersToLevels,
  2: addCollection,
  3: addHistoryAnimals,
  4: addBonus,
};
