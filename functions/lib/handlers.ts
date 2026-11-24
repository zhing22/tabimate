// The runs API's work, apart from Cloudflare's plumbing (functions/api/runs.ts):
// the database, the puzzle files and the clock come in, so tests drive these
// against a local D1.
import { STATS } from '../../src/config/stats.ts';
import { dailyKey, isDateKey } from '../../src/core/date.ts';
import type { DateKey } from '../../src/core/types.ts';
import { checkAgainstPuzzle, readPuzzleAnswers } from './puzzleCheck.ts';
import { parseRunBody } from './runBody.ts';
import { dayStatsFrom, dayStatsQuery, insertRun, type CountRow } from './sql.ts';

export interface RunsDeps {
  readonly db: D1Database;
  /** The static puzzle file's JSON for a date; null if there is none. */
  readonly loadPuzzle: (dateKey: DateKey) => Promise<unknown>;
  readonly now: () => Date;
  /** The site's own origin: a POST from any other is refused. */
  readonly origin: string;
}

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });

const problem = (status: number, error: string) => json({ error }, status);

/**
 * The body as JSON, refusing anything bigger than a run can be: at once by
 * its Content-Length, and while reading (in bytes) for a body without one,
 * so a large upload is never buffered whole.
 */
async function readJson(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > STATS.maxBodyBytes) throw new RangeError('too large');
  return JSON.parse(await readLimited(request, STATS.maxBodyBytes)) as unknown;
}

/** The body as text, stopping (and throwing) once it passes `max` bytes. */
async function readLimited(request: Request, max: number): Promise<string> {
  const reader: ReadableStreamDefaultReader<Uint8Array> | undefined = request.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new RangeError('too large');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/** A cross-site write: a browser sends Origin, and it isn't this site's. */
const fromElsewhere = (request: Request, deps: RunsDeps) => {
  const origin = request.headers.get('origin');
  return origin !== null && origin !== deps.origin;
};

/** POST /api/runs: store a finished run once per device and day. 204 when stored (or already). */
export async function postRun(request: Request, deps: RunsDeps): Promise<Response> {
  if (fromElsewhere(request, deps)) return problem(403, 'not from this site');
  let body: unknown;
  try {
    body = await readJson(request);
  } catch (error) {
    return error instanceof RangeError ? problem(413, 'body too large') : problem(400, 'not JSON');
  }
  const run = parseRunBody(body, dailyKey(deps.now()));
  if (!run.ok) return problem(400, run.error);
  const puzzle = readPuzzleAnswers(await deps.loadPuzzle(run.value.dateKey));
  if (!puzzle) return problem(400, `no puzzle for ${run.value.dateKey}`);
  const rows = checkAgainstPuzzle(run.value, puzzle);
  if (!rows.ok) return problem(400, rows.error);
  const { deviceId, dateKey } = run.value;
  const statements = insertRun(deviceId, dateKey, rows.value, deps.now().getTime());
  await deps.db.batch(statements.map((s) => deps.db.prepare(s.sql).bind(...s.params)));
  return new Response(null, { status: 204 });
}

/** GET /api/runs?date=YYYY-MM-DD: players per prompt and answer. Cacheable for a minute. */
export async function getDayStats(url: URL, deps: RunsDeps): Promise<Response> {
  const date = url.searchParams.get('date') ?? '';
  if (!isDateKey(date)) return problem(400, 'date must be YYYY-MM-DD');
  const query = dayStatsQuery(date);
  const { results } = await deps.db
    .prepare(query.sql)
    .bind(...query.params)
    .all<CountRow>();
  return json(dayStatsFrom(date, results), 200, {
    'cache-control': `public, max-age=${STATS.cacheSeconds}`,
  });
}
