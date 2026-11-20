// Save migrations: MIGRATIONS[n] turns version n data into version n + 1. To
// change the save's shape, bump SCHEMA_VERSION (saveData.ts) and add an entry;
// old saves are upgraded on load. Each step works on raw JSON, defensively.
import { journalFromRuns } from './collectionGuards';
import { isObject, isRunState } from './saveGuards';

type Json = Record<string, unknown>;
export type Migration = (data: Json) => Json;

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
  const runs = isObject(data.runs) ? Object.values(data.runs).filter(isRunState) : [];
  return { ...data, journal: journalFromRuns(runs), achievements: [] };
}

export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  1: tiersToLevels,
  2: addCollection,
};
