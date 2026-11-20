// Released puzzles must not change: a player who finished a day keeps their
// stored levels, so new levels or answers would make that day's scores
// disagree. scripts/released-puzzles.json records a fingerprint of each day
// once it has gone live; validate-data warns when a recorded day changes.
import { createHash } from 'node:crypto';

/** date (or "date/bonus" for its bonus quiz) -> fingerprint of the file as released. */
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
  /**
   * Unrecorded days older than today. The daily record job adds each day just
   * after it goes live, so only today may be missing; older ones mean it fell behind.
   */
  readonly overdue: string[];
  /** The record with the unrecorded days added; never overwrites a day. */
  readonly updated: ReleasedRecord;
}

/** The day a record key belongs to: "2026-11-22/bonus" -> "2026-11-22". */
const dayOf = (key: string): string => key.slice(0, 10);

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
    if (dayOf(date) > today) continue;
    const print = fingerprint(json);
    const known = record[date];
    if (known === undefined) {
      unrecorded.push(date);
      updated[date] = print;
    } else if (known !== print) changed.push(date);
  }
  return { changed, unrecorded, overdue: unrecorded.filter((d) => dayOf(d) < today), updated };
}
