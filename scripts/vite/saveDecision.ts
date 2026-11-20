// Whether the dev API may save a day file, and what to tell the editor. Pure,
// so it is tested without a server (devPuzzleApi.test.ts).
export interface SaveDecision {
  readonly status: number;
  readonly message: string;
}

/** Which kind of day file is being saved: a puzzle, or its bonus quiz. */
export type DayFileKind = 'puzzles' | 'bonus';

export interface SaveRequest {
  readonly kind: DayFileKind;
  readonly date: string;
  readonly body: string;
  readonly contentType: string | undefined;
  /** The request's Origin header, and the Host it was sent to. */
  readonly origin: string | undefined;
  readonly host: string | undefined;
  /** The live puzzle key now (dailyKey): that day and earlier are frozen. */
  readonly today: string;
  readonly isDateKey: (value: string) => boolean;
  /** Every reason the file can't be saved for that date (validator, name check); empty if none. */
  readonly problems: (json: unknown, date: string) => readonly string[];
}

/**
 * Only the dev server's own pages may write. Requiring application/json forces
 * a CORS preflight, so another site's plain form or text/plain POST can't get
 * here unchecked; requiring our own Origin turns away anything that does.
 */
function refuseForeign(req: SaveRequest): SaveDecision | null {
  if (!(req.contentType ?? '').toLowerCase().startsWith('application/json')) {
    return { status: 415, message: 'Content-Type must be application/json' };
  }
  const own = req.host ? [`http://${req.host}`, `https://${req.host}`] : [];
  if (!req.origin || !own.includes(req.origin)) {
    return {
      status: 403,
      message: `requests must come from this dev server (Origin ${req.origin ?? 'missing'})`,
    };
  }
  return null;
}

/** Whether to save, and what to tell the editor. Pure, so it can be tested. */
export function decideSave(req: SaveRequest): SaveDecision & { json?: unknown } {
  const foreign = refuseForeign(req);
  if (foreign) return foreign;
  if (!req.isDateKey(req.date)) return { status: 400, message: `"${req.date}" is not a date` };
  if (req.date <= req.today) {
    return {
      status: 409,
      message: `${req.date} has gone live (today is ${req.today}); released days are frozen`,
    };
  }
  let json: unknown;
  try {
    json = JSON.parse(req.body);
  } catch {
    return { status: 400, message: 'the body is not JSON' };
  }
  const problems = req.problems(json, req.date);
  if (problems.length > 0) return { status: 422, message: problems.join('\n') };
  return { status: 200, message: `saved public/data/${req.kind}/${req.date}.json`, json };
}
