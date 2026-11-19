// Dev server only: lets the puzzle editor (dev/puzzles.html) save a day's file
// into public/data/puzzles/. POST /__dev/puzzles/YYYY-MM-DD with the puzzle JSON.
// It runs the real validator first and refuses days that have gone live
// (released puzzles are frozen). `vite build` never includes it.
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin, ViteDevServer } from 'vite';
import type * as DateModule from '../../src/core/date.ts';
import type * as ValidateModule from '../../src/data/validate.ts';
import { readJson, writeJson } from '../lib/jsonFile.ts';

export const ROUTE = '/__dev/puzzles/';

export interface SaveDecision {
  readonly status: number;
  readonly message: string;
}

export interface SaveRequest {
  readonly date: string;
  readonly body: string;
  /** The live puzzle key now (dailyKey): that day and earlier are frozen. */
  readonly today: string;
  readonly isDateKey: (value: string) => boolean;
  /** Throws (a DataError) if the puzzle is invalid for that date. */
  readonly validate: (json: unknown, date: string) => void;
}

/** Whether to save, and what to tell the editor. Pure, so it can be tested. */
export function decideSave(req: SaveRequest): SaveDecision & { json?: unknown } {
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
  try {
    req.validate(json, req.date);
  } catch (error) {
    return { status: 422, message: error instanceof Error ? error.message : String(error) };
  }
  return { status: 200, message: `saved public/data/puzzles/${req.date}.json`, json };
}

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => (body += chunk));
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });

const reply = (res: ServerResponse, { status, message }: SaveDecision) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ message }));
};

interface GameModules {
  validate: SaveRequest['validate'];
  isDateKey: SaveRequest['isDateKey'];
  today: () => string;
}

/** The game's own validator and date code, loaded through Vite so "@/" imports resolve. */
async function loadGame(server: ViteDevServer): Promise<GameModules> {
  const validate = (await server.ssrLoadModule('/src/data/validate.ts')) as typeof ValidateModule;
  const date = (await server.ssrLoadModule('/src/core/date.ts')) as typeof DateModule;
  // Read fresh each save, so edits to animals.json count without a restart.
  const animals = validate.validateAnimals(
    readJson<unknown>('public/data/animals.json'),
    'data/animals.json',
  );
  return {
    isDateKey: date.isDateKey,
    today: () => date.dailyKey(new Date()),
    validate: (json, key) => {
      validate.validatePuzzle(json, { file: `data/puzzles/${key}.json`, key, animals });
    },
  };
}

export const devPuzzleApi = (): Plugin => ({
  name: 'tabimate-dev-puzzle-api',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use(ROUTE, (req, res, next) => {
      if (req.method !== 'POST') return next();
      const date = (req.url ?? '').replace(/^\//, '').split('?')[0]!;
      void (async () => {
        try {
          const game = await loadGame(server);
          const decision = decideSave({
            date,
            body: await readBody(req),
            today: game.today(),
            isDateKey: game.isDateKey,
            validate: game.validate,
          });
          if (decision.json !== undefined) {
            await writeJson(`public/data/puzzles/${date}.json`, decision.json);
          }
          reply(res, decision);
        } catch (error) {
          reply(res, {
            status: 500,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      })();
    });
  },
});
