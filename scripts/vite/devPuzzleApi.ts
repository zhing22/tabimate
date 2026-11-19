// Dev server only: lets the puzzle editor (dev/puzzles.html) save a day's file
// into public/data/puzzles/. POST /__dev/puzzles/YYYY-MM-DD with the puzzle JSON.
// It runs the same checks as validate-data (validator and name check), refuses
// days that have gone live (released puzzles are frozen), and only accepts
// requests from the dev server's own pages. `vite build` never includes it.
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin, ViteDevServer } from 'vite';
import type * as DateModule from '../../src/core/date.ts';
import type * as ValidateModule from '../../src/data/validate.ts';
import type * as CheckModule from '../../src/dev/editor/check.ts';
import { readJson, writeJson } from '../lib/jsonFile.ts';
import { MAX_BODY_BYTES, readBody } from './readBody.ts';

export const ROUTE = '/__dev/puzzles/';

export interface SaveDecision {
  readonly status: number;
  readonly message: string;
}

export interface SaveRequest {
  readonly date: string;
  readonly body: string;
  readonly contentType: string | undefined;
  /** The request's Origin header, and the Host it was sent to. */
  readonly origin: string | undefined;
  readonly host: string | undefined;
  /** The live puzzle key now (dailyKey): that day and earlier are frozen. */
  readonly today: string;
  readonly isDateKey: (value: string) => boolean;
  /** Every reason the puzzle can't be saved for that date (validator, name check); empty if none. */
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
      message: `${req.date} has gone live (today is ${req.today}); released puzzles are frozen`,
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
  return { status: 200, message: `saved public/data/puzzles/${req.date}.json`, json };
}

const reply = (res: ServerResponse, { status, message }: SaveDecision) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ message }));
};

interface GameModules {
  problems: SaveRequest['problems'];
  isDateKey: SaveRequest['isDateKey'];
  today: () => string;
}

/** The game's own checks and date code, loaded through Vite so "@/" imports resolve. */
async function loadGame(server: ViteDevServer): Promise<GameModules> {
  const validate = (await server.ssrLoadModule('/src/data/validate.ts')) as typeof ValidateModule;
  const date = (await server.ssrLoadModule('/src/core/date.ts')) as typeof DateModule;
  const check = (await server.ssrLoadModule('/src/dev/editor/check.ts')) as typeof CheckModule;
  // Read fresh each save, so edits to animals.json count without a restart.
  const animals = validate.validateAnimals(
    readJson<unknown>('public/data/animals.json'),
    'data/animals.json',
  );
  return {
    isDateKey: date.isDateKey,
    today: () => date.dailyKey(new Date()),
    // The same pair validate-data runs: the validator, then the name check.
    problems: (json) => {
      const result = check.checkPuzzle(json as Parameters<typeof check.checkPuzzle>[0], animals);
      return result.error ? [result.error] : result.collisions;
    },
  };
}

async function handle(server: ViteDevServer, req: IncomingMessage, res: ServerResponse) {
  const body = await readBody(req);
  if (body === null) {
    reply(res, { status: 413, message: `the body is over ${MAX_BODY_BYTES} bytes` });
    return;
  }
  const game = await loadGame(server);
  const date = (req.url ?? '').replace(/^\//, '').split('?')[0]!;
  const decision = decideSave({
    date,
    body,
    contentType: req.headers['content-type'],
    origin: req.headers.origin,
    host: req.headers.host,
    today: game.today(),
    isDateKey: game.isDateKey,
    problems: game.problems,
  });
  if (decision.json !== undefined) {
    await writeJson(`public/data/puzzles/${date}.json`, decision.json);
  }
  reply(res, decision);
}

export const devPuzzleApi = (): Plugin => ({
  name: 'tabimate-dev-puzzle-api',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use(ROUTE, (req, res, next) => {
      if (req.method !== 'POST') return next();
      handle(server, req, res).catch((error: unknown) => {
        reply(res, {
          status: 500,
          message: error instanceof Error ? error.message : String(error),
        });
      });
    });
  },
});
