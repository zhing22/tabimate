// Dev server only: lets the puzzle editor (dev/puzzles.html) save a day's files:
// POST /__dev/puzzles/YYYY-MM-DD with the puzzle JSON (public/data/puzzles/),
// POST /__dev/bonus/YYYY-MM-DD with a Sunday's bonus quiz (public/data/bonus/).
// It runs the same checks as validate-data (validator and name check), refuses
// days that have gone live (released puzzles are frozen), and only accepts
// requests from the dev server's own pages. `vite build` never includes it.
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin, ViteDevServer } from 'vite';
import type * as DateModule from '../../src/core/date.ts';
import type * as ValidateModule from '../../src/data/validate.ts';
import type * as ThemesModule from '../../src/config/themes.ts';
import type * as BonusModule from '../../src/data/validateBonus.ts';
import type * as CheckModule from '../../src/dev/editor/check.ts';
import { readJson, writeJson } from '../lib/jsonFile.ts';
import { MAX_BODY_BYTES, readBody } from './readBody.ts';
import {
  decideSave,
  type DayFileKind,
  type SaveDecision,
  type SaveRequest,
} from './saveDecision.ts';

export { decideSave, type SaveDecision, type SaveRequest } from './saveDecision.ts';

export const ROUTES: Readonly<Record<DayFileKind, string>> = {
  puzzles: '/__dev/puzzles/',
  bonus: '/__dev/bonus/',
};

const reply = (res: ServerResponse, { status, message }: SaveDecision) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ message }));
};

interface GameModules {
  problems: Readonly<Record<DayFileKind, SaveRequest['problems']>>;
  isDateKey: SaveRequest['isDateKey'];
  today: () => string;
}

/** The game's own checks and date code, loaded through Vite so "@/" imports resolve. */
async function loadGame(server: ViteDevServer): Promise<GameModules> {
  const validate = (await server.ssrLoadModule('/src/data/validate.ts')) as typeof ValidateModule;
  const date = (await server.ssrLoadModule('/src/core/date.ts')) as typeof DateModule;
  const check = (await server.ssrLoadModule('/src/dev/editor/check.ts')) as typeof CheckModule;
  const bonus = (await server.ssrLoadModule('/src/data/validateBonus.ts')) as typeof BonusModule;
  const themes = (await server.ssrLoadModule('/src/config/themes.ts')) as typeof ThemesModule;
  // Read fresh each save, so edits to animals.json count without a restart.
  const animals = validate.validateAnimals(
    readJson<unknown>('public/data/animals.json'),
    'data/animals.json',
  );
  return {
    isDateKey: date.isDateKey,
    today: () => date.dailyKey(new Date()),
    problems: {
      // The same pair validate-data runs: the validator, then the name check.
      puzzles: (json) => {
        const result = check.checkPuzzle(json as Parameters<typeof check.checkPuzzle>[0], animals);
        return result.error ? [result.error] : result.collisions;
      },
      bonus: (json, date) => {
        if (!themes.themeFor(date)?.bonusQuiz) return [`${date} has no bonus quiz`];
        try {
          bonus.validateBonus(json, `data/bonus/${date}.json`, date);
          return [];
        } catch (error) {
          return [error instanceof Error ? error.message : String(error)];
        }
      },
    },
  };
}

async function handle(
  kind: DayFileKind,
  server: ViteDevServer,
  req: IncomingMessage,
  res: ServerResponse,
) {
  const body = await readBody(req);
  if (body === null) {
    reply(res, { status: 413, message: `the body is over ${MAX_BODY_BYTES} bytes` });
    return;
  }
  const game = await loadGame(server);
  const date = (req.url ?? '').replace(/^\//, '').split('?')[0]!;
  const decision = decideSave({
    kind,
    date,
    body,
    contentType: req.headers['content-type'],
    origin: req.headers.origin,
    host: req.headers.host,
    today: game.today(),
    isDateKey: game.isDateKey,
    problems: game.problems[kind],
  });
  if (decision.json !== undefined) {
    await writeJson(`public/data/${kind}/${date}.json`, decision.json);
  }
  reply(res, decision);
}

export const devPuzzleApi = (): Plugin => ({
  name: 'tabimate-dev-puzzle-api',
  apply: 'serve',
  configureServer(server) {
    for (const kind of Object.keys(ROUTES) as DayFileKind[]) {
      server.middlewares.use(ROUTES[kind], (req, res, next) => {
        if (req.method !== 'POST') return next();
        handle(kind, server, req, res).catch((error: unknown) => {
          reply(res, {
            status: 500,
            message: error instanceof Error ? error.message : String(error),
          });
        });
      });
    }
  },
});
