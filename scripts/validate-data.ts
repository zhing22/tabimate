// Validates everything in public/data (and the sprite list) with the same code
// the game uses, and checks a puzzle exists for each of the next days in SGT,
// so a broken or missing puzzle can't deploy. Part of `npm run check`.
//
//   npm run validate-data [-- --days 7]
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { dailyKey, shiftKey } from '../src/core/date.ts';
import { validateAnimals, validatePuzzle } from '../src/data/validate.ts';
import {
  validateAnimalArt,
  validateMasterPalette,
  validatePalettes,
} from '../src/data/validateArt.ts';
import { parseAsepriteSheet } from '../src/scene/sprites/sheet.ts';

const { values } = parseArgs({ options: { days: { type: 'string', default: '7' } } });
const DAYS_AHEAD = Number(values.days);
const DATA = 'public/data';
const SPRITES = 'public/assets/sprites';

const problems: string[] = [];
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
    check(`puzzles/${name}`, () =>
      validatePuzzle(readJson(`${DATA}/puzzles/${name}`), {
        file: `data/puzzles/${name}`,
        key,
        animals,
      }),
    );
  }
}

// A puzzle for today (in SGT, after the noon reset) and each of the next days.
const today = dailyKey(new Date());
const needed = Array.from({ length: DAYS_AHEAD }, (_, i) => shiftKey(today, i));
const missing = needed.filter((key) => !keys.has(key));
if (missing.length > 0) {
  problems.push(`missing puzzles for the next ${DAYS_AHEAD} SGT days: ${missing.join(', ')}`);
}

if (problems.length > 0) {
  console.error(`Data check failed (${problems.length}):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
const last = [...keys].sort().at(-1);
console.log(
  `Data OK: ${animals?.size ?? 0} animals, ${files.length} puzzles (last ${last}), ` +
    `${sheets.length} sprite sheet(s); today is ${today}, the next ${DAYS_AHEAD} days are covered.`,
);
