// What validate-data says about released days: changed ones fail, unrecorded
// ones are recorded (--record), overdue or pending ones are reported.
import { checkReleased, type ReleasedRecord } from './released.ts';

export interface ReleaseReport {
  readonly problems: string[];
  readonly warnings: string[];
  /** The record to write (with --record and something new), else null. */
  readonly updated: ReleasedRecord | null;
  readonly recorded: number;
}

/** "2026-11-22" -> puzzles/2026-11-22.json; "2026-11-22/bonus" -> bonus/2026-11-22.json. */
const fileOf = (key: string): string =>
  key.endsWith('/bonus') ? `bonus/${key.slice(0, 10)}.json` : `puzzles/${key}.json`;

export function releaseReport(
  live: ReadonlyMap<string, unknown>,
  today: string,
  record: ReleasedRecord,
  recording: boolean,
  recordFile: string,
): ReleaseReport {
  const problems: string[] = [];
  const warnings: string[] = [];
  const released = checkReleased(live, today, record);
  // A changed live day fails: players who finished it keep levels the file no longer has.
  for (const key of released.changed) {
    problems.push(
      `${fileOf(key)} changed after it went live; players' saved runs no longer match it ` +
        `(restore it, and fix a future day instead)`,
    );
  }
  if (recording && released.unrecorded.length > 0) {
    return { problems, warnings, updated: released.updated, recorded: released.unrecorded.length };
  }
  if (released.overdue.length > 0) {
    // The daily "record" job (.github/workflows/check.yml) should have added these.
    problems.push(
      `released days not recorded: ${released.overdue.join(', ')}; the daily record job fell ` +
        `behind (run npm run validate-data -- --record and commit ${recordFile})`,
    );
  } else if (released.unrecorded.length > 0) {
    warnings.push(
      `today's puzzle ${released.unrecorded.join(', ')} is live but not recorded yet ` +
        `(the daily record job adds it just after noon SGT)`,
    );
  }
  return { problems, warnings, updated: null, recorded: 0 };
}
