// The art to-do list: which archetypes players see most, and the top ones
// still without a pixel sheet (drawn as emoji). Read-only.
//
//   npm run sprite-coverage [-- --all]   (--all lists every archetype, not just the top)
import { readdirSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { COVERAGE } from '../src/config/sprites.ts';
import { dailyKey } from '../src/core/date.ts';
import { validateAnimals } from '../src/data/validate.ts';
import { readJson } from './lib/jsonFile.ts';
import { spriteCoverage, type CoveragePuzzle } from './lib/spriteCoverage.ts';

const { values } = parseArgs({ options: { all: { type: 'boolean', default: false } } });
const DATA = 'public/data';
const animals = validateAnimals(readJson<unknown>(`${DATA}/animals.json`), 'data/animals.json');
const sheets = new Set(readJson<string[]>('public/assets/sprites/manifest.json'));
const puzzles = readdirSync(`${DATA}/puzzles`)
  .filter((name) => name.endsWith('.json'))
  .map((name) => readJson<CoveragePuzzle>(`${DATA}/puzzles/${name}`));
const today = dailyKey(new Date());

const rows = spriteCoverage(puzzles, animals, sheets, today);
const total = rows.reduce((sum, r) => sum + r.weight, 0);
const drawn = rows.filter((r) => r.hasSheet).reduce((sum, r) => sum + r.weight, 0);
const pct = (w: number) => `${((100 * w) / (total || 1)).toFixed(1)}%`;

const line = (r: (typeof rows)[number], rank: number) => {
  const sample = r.animals.slice(0, 4).join(', ') + (r.animals.length > 4 ? ', ...' : '');
  return (
    `${String(rank).padStart(3)}. ${r.archetype.padEnd(16)} ${pct(r.weight).padStart(6)}` +
    `  ${String(r.answers).padStart(4)} answers  ${r.hasSheet ? 'sheet' : '     '}  ${sample}`
  );
};

console.log(
  `${puzzles.length} puzzles, ${rows.length} archetypes; today ${today}. ` +
    `Weighted: today and upcoming days count 1, older days halve every ${COVERAGE.halfLifeDays} days.`,
);
console.log(`Pixel sheets cover ${pct(drawn)} of what players see (${sheets.size} sheets).\n`);

const missing = rows.filter((r) => !r.hasSheet);
console.log(
  `Top ${Math.min(COVERAGE.top, missing.length)} archetypes without a sheet (art to make next):`,
);
missing.slice(0, COVERAGE.top).forEach((r, i) => console.log(line(r, i + 1)));

if (values.all) {
  console.log('\nEvery archetype:');
  rows.forEach((r, i) => console.log(line(r, i + 1)));
}
