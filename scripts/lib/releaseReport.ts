// What validate-data says about released days: changed, removed or late files
// fail; unrecorded ones are recorded (--record), or reported as overdue or pending.
import { checkReleased, type ReleasedRecord } from './released.ts';

export interface ReleaseReport {
  readonly problems: string[];
  readonly warnings: string[];
  /** The record to write (with --record and something new), else null. */
  readonly updated: ReleasedRecord | null;
  readonly recorded: number;
}

/** "2026-11-22" -> puzzles/2026-11-22.json; "2026-11-22/bonus" -> bonus/2026-11-22.json. */
export const fileOf = (key: string): string =>
  key.endsWith('/bonus') ? `bonus/${key.slice(0, 10)}.json` : `puzzles/${key}.json`;

/** Files that went live and then changed, vanished, or appeared too late: all break saved runs. */
function brokenFiles(released: ReturnType<typeof checkReleased>): string[] {
  const fix = '(restore it, and fix a future day instead)';
  return [
    ...released.changed.map(
      (key) =>
        `${fileOf(key)} changed after it went live; players' saved runs no longer match it ${fix}`,
    ),
    ...released.removed.map(
      (key) => `${fileOf(key)} was removed after it went live; players' saved runs need it ${fix}`,
    ),
    ...released.late.map(
      (key) =>
        `${fileOf(key)} was added after its day went live; anyone who already finished that ` +
        `day has no quiz in their saved run (remove it; quizzes must be ready before noon)`,
    ),
  ];
}

export function releaseReport(
  live: ReadonlyMap<string, unknown>,
  today: string,
  record: ReleasedRecord,
  recording: boolean,
  recordFile: string,
): ReleaseReport {
  const released = checkReleased(live, today, record);
  const problems = brokenFiles(released);
  const warnings: string[] = [];
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
