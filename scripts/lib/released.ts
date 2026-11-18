// Released puzzles must not change: a player who finished a day keeps their
// stored levels, so new levels or answers would make that day's scores
// disagree. scripts/released-puzzles.json records a fingerprint of each day
// once it has gone live; validate-data warns when a recorded day changes.
import { createHash } from 'node:crypto';

/** date -> fingerprint of the puzzle as released. */
export type ReleasedRecord = Readonly<Record<string, string>>;

/** Fingerprint of a puzzle's content: formatting and key order don't count. */
export function fingerprint(json: unknown): string {
  const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') {
      const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
      return Object.fromEntries(entries.map(([k, v]) => [k, canonical(v)]));
    }
    return value;
  };
  return createHash('sha256')
    .update(JSON.stringify(canonical(json)))
    .digest('hex')
    .slice(0, 16);
}

export interface ReleaseCheck {
  /** Released days whose content no longer matches the record. */
  readonly changed: string[];
  /** Released days not in the record yet (run with --record to add them). */
  readonly unrecorded: string[];
  /** The record with the unrecorded days added; never overwrites a day. */
  readonly updated: ReleasedRecord;
}

/** Compares puzzles that have gone live (date <= today) with the record. */
export function checkReleased(
  puzzles: ReadonlyMap<string, unknown>,
  today: string,
  record: ReleasedRecord,
): ReleaseCheck {
  const changed: string[] = [];
  const unrecorded: string[] = [];
  const updated: Record<string, string> = { ...record };
  for (const [date, json] of [...puzzles].sort(([a], [b]) => a.localeCompare(b))) {
    if (date > today) continue;
    const print = fingerprint(json);
    const known = record[date];
    if (known === undefined) {
      unrecorded.push(date);
      updated[date] = print;
    } else if (known !== print) changed.push(date);
  }
  return { changed, unrecorded, updated };
}
