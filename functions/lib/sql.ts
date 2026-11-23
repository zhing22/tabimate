// The SQL the runs API sends to D1, built as plain { sql, params } so it can
// be tested without a database. Every value is a bound parameter.
import type { DayStats } from '../../src/core/stats.ts';
import type { DateKey } from '../../src/core/types.ts';
import type { RunRow } from './puzzleCheck.ts';

export interface Statement {
  readonly sql: string;
  readonly params: readonly (string | number | null)[];
}

/** One row per prompt; a device's second submission of a day changes nothing. */
export const INSERT_RUN =
  'INSERT OR IGNORE INTO runs (device_id, date_key, prompt_id, answer_id, level, created_at) ' +
  'VALUES (?, ?, ?, ?, ?, ?)';

export const insertRun = (
  deviceId: string,
  dateKey: DateKey,
  rows: readonly RunRow[],
  nowMs: number,
): Statement[] =>
  rows.map((row) => ({
    sql: INSERT_RUN,
    params: [deviceId, dateKey, row.promptId, row.answerId, row.level, nowMs],
  }));

/** Players per prompt and answer for a day (a miss is a NULL answer). */
export const dayStatsQuery = (dateKey: DateKey): Statement => ({
  sql:
    'SELECT prompt_id, answer_id, COUNT(*) AS n FROM runs WHERE date_key = ? ' +
    'GROUP BY prompt_id, answer_id',
  params: [dateKey],
});

export interface CountRow {
  readonly prompt_id: string;
  readonly answer_id: string | null;
  readonly n: number;
}

/** The query's rows as DayStats: a prompt's players are all its rows, misses included. */
export function dayStatsFrom(dateKey: DateKey, rows: readonly CountRow[]): DayStats {
  const prompts: Record<string, { players: number; answers: Record<string, number> }> = {};
  for (const { prompt_id, answer_id, n } of rows) {
    const prompt = (prompts[prompt_id] ??= { players: 0, answers: {} });
    prompt.players += n;
    if (answer_id !== null) prompt.answers[answer_id] = n;
  }
  return { dateKey, prompts };
}
