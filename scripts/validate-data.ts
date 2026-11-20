// Validates everything in public/data (and the sprite list) with the same code
// the game uses, and checks a puzzle exists for each of the next days in SGT,
// so a broken or missing puzzle can't deploy. Part of `npm run check`.
//
//   npm run validate-data [-- --days 7] [-- --record]
//
// --record adds days that have gone live to scripts/released-puzzles.json, so a
// later edit to them is flagged. It never overwrites a recorded day.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { dailyKey, shiftKey } from '../src/core/date.ts';
import { nameCollisions } from '../src/data/checkNames.ts';
import { validateAnimals, validatePuzzle } from '../src/data/validate.ts';
import {
  validateAnimalArt,
  validateMasterPalette,
  validatePalettes,
} from '../src/data/validateArt.ts';
import { parseAsepriteSheet } from '../src/scene/sprites/sheet.ts';
import { checkBonusFiles } from './lib/bonusFiles.ts';
import type { ReleasedRecord } from './lib/released.ts';
import { releaseReport } from './lib/releaseReport.ts';

const { values } = parseArgs({
  options: { days: { type: 'string', default: '7' }, record: { type: 'boolean', default: false } },
});
const RELEASED = 'scripts/released-puzzles.json';
const DAYS_AHEAD = Number(values.days);
const DATA = 'public/data';
const SPRITES = 'public/assets/sprites';

const problems: string[] = [];
// Non-fatal: printed, but the check still passes.
const warnings: string[] = [];
/** Runs one check; a thrown error (DataError names file and field) is collected. */
function check<T>(what: string, run: () => T): T | undefined {
  try {
    return run();
  } catch (error) {
    problems.push(`${what}: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}
const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

const animalsJson = check('animals.json', () => readJson(`${DATA}/animals.json`));
const animals = check('animals.json', () => validateAnimals(animalsJson, 'data/animals.json'));
const palettes = check('palettes.json', () =>
  validatePalettes(readJson(`${DATA}/palettes.json`), 'data/palettes.json'),
);
check('master-palette.json', () =>
  validateMasterPalette(readJson(`${DATA}/master-palette.json`), 'data/master-palette.json'),
);
if (palettes) {
  check('animal colours', () => validateAnimalArt(animalsJson, 'data/animals.json', palettes));
}

// Sprite sheets listed in the manifest must exist and parse.
const sheets =
  check('sprite manifest', () => readJson(`${SPRITES}/manifest.json`) as string[]) ?? [];
for (const archetype of sheets) {
  check(`sprite sheet ${archetype}`, () => {
    if (!existsSync(`${SPRITES}/${archetype}.png`)) throw new Error(`${archetype}.png is missing`);
    parseAsepriteSheet(readJson(`${SPRITES}/${archetype}.json`));
  });
}

// Every puzzle file, with the shared validator (dates, numbers, answers, names).
const files = readdirSync(`${DATA}/puzzles`).filter((name) => name.endsWith('.json'));
const keys = new Set(files.map((name) => name.replace(/\.json$/, '')));
if (animals) {
  for (const name of files) {
    const key = name.replace(/\.json$/, '');
    const puzzle = check(`puzzles/${name}`, () =>
      validatePuzzle(readJson(`${DATA}/puzzles/${name}`), {
        file: `data/puzzles/${name}`,
        key,
        animals,
        warn: (message) => warnings.push(message),
      }),
    );
    // Each answer's names must lead back to it, or a correct name could not score.
    for (const collision of puzzle ? nameCollisions(puzzle, animals) : []) {
      problems.push(`puzzles/${name}: ${collision}`);
    }
  }
}

// A puzzle for today (in SGT, after the noon reset) and each of the next days.
const today = dailyKey(new Date());
const needed = Array.from({ length: DAYS_AHEAD }, (_, i) => shiftKey(today, i));
const missing = needed.filter((key) => !keys.has(key));
if (missing.length > 0) {
  problems.push(`missing puzzles for the next ${DAYS_AHEAD} SGT days: ${missing.join(', ')}`);
}
// Bonus quizzes: valid, and present for every upcoming quiz day (Sunday Deep Dive).
const bonus = checkBonusFiles(`${DATA}/bonus`, needed);
problems.push(...bonus.problems);
warnings.push(...bonus.warnings);

// Days that have gone live (today included) must not change; see scripts/lib/released.ts.
const record = existsSync(RELEASED) ? (readJson(RELEASED) as ReleasedRecord) : {};
const live = new Map(
  files
    .map(
      (name) =>
        [
          name.replace(/\.json$/, ''),
          check(name, () => readJson(`${DATA}/puzzles/${name}`)),
        ] as const,
    )
    .filter(([, json]) => json !== undefined),
);
// A live day's quiz is frozen with it (players' saved runs count its questions).
for (const [date, json] of bonus.files) live.set(`${date}/bonus`, json);
const release = releaseReport(live, today, record, values.record, RELEASED);
problems.push(...release.problems);
warnings.push(...release.warnings);
if (release.updated) {
  writeFileSync(RELEASED, `${JSON.stringify(release.updated, null, 2)}\n`);
  console.log(`Recorded ${release.recorded} released day(s) in ${RELEASED}.`);
}

if (warnings.length > 0) {
  console.warn(`Data warnings (${warnings.length}):`);
  for (const warning of warnings) console.warn(`  - ${warning}`);
}
if (problems.length > 0) {
  console.error(`Data check failed (${problems.length}):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  // --record still has to record: the check job reports data problems, and a
  // record job that stopped here would leave the new live day unfrozen.
  if (!values.record) process.exit(1);
}
if (values.record) {
  // The record job's own result: today's live puzzle must now be in the file on
  // disk. A crash before this point (bad JSON, a script error) also fails.
  const saved = readJson(RELEASED) as ReleasedRecord;
  if (saved[today] === undefined) {
    console.error(`Record failed: today's puzzle ${today} is not in ${RELEASED}.`);
    process.exit(2);
  }
  console.log(`Record OK: ${today} is in ${RELEASED}.`);
  process.exit(0);
}
const last = [...keys].sort().at(-1);
console.log(
  `Data OK: ${animals?.size ?? 0} animals, ${files.length} puzzles (last ${last}), ` +
    `${sheets.length} sprite sheet(s); today is ${today}, the next ${DAYS_AHEAD} days are covered.`,
);
