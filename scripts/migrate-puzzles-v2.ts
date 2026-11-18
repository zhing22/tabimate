// One-off v2 data migration: puzzle answers go from `tier` to `level`, every
// existing animal becomes `kind: "species"`, and prompts that break the
// one-CR-per-prompt rule are listed. Safe to run again on migrated data.
//
//   npx tsx scripts/migrate-puzzles-v2.ts            dry run: report only
//   npx tsx scripts/migrate-puzzles-v2.ts --fix-cr   also pick one CR per prompt (placeholder)
//   npx tsx scripts/migrate-puzzles-v2.ts --write    save the files
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { format, resolveConfig } from 'prettier';
import {
  animalsToV2,
  appearances,
  crProblems,
  fixCr,
  puzzleToV2,
  type PuzzleJson,
} from './lib/puzzlesV2.ts';

const { values } = parseArgs({
  options: { write: { type: 'boolean', default: false }, 'fix-cr': { type: 'boolean' } },
});
const DATA = 'public/data';
const PUZZLES = `${DATA}/puzzles`;

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
/** Same layout as the rest of the repo (prettier), so the diff shows only real changes. */
async function save(path: string, data: unknown) {
  const options = (await resolveConfig(path)) ?? {};
  writeFileSync(path, await format(JSON.stringify(data), { ...options, filepath: path }));
}

const animalsPath = `${DATA}/animals.json`;
const animals = animalsToV2(readJson(animalsPath) as Record<string, unknown>[]);
const files = readdirSync(PUZZLES).filter((name) => name.endsWith('.json'));
const puzzles = new Map<string, PuzzleJson>(
  files.map((name) => [
    name,
    puzzleToV2(readJson(`${PUZZLES}/${name}`) as Record<string, unknown>),
  ]),
);

const problems = crProblems([...puzzles.values()]);
console.log(`${files.length} puzzle files, ${animals.length} animals.`);
console.log(`Prompts breaking "exactly one CR (level 5)": ${problems.length}`);
for (const p of problems) {
  const which = p.top.length === 0 ? 'none' : p.top.join(', ');
  console.log(`  ${p.date} ${p.promptId} (${p.top.length} CR): ${which}`);
}

if (values['fix-cr']) {
  const counts = appearances([...puzzles.values()]);
  console.log('\nPlaceholder CR picks (fewest appearances overall, then id), for review:');
  for (const puzzle of puzzles.values()) {
    for (const fix of fixCr(puzzle, counts)) {
      const change = fix.promoted
        ? `promoted ${fix.promoted} to 5`
        : `kept ${fix.kept} at 5; ${fix.demoted.join(', ')} to 4`;
      console.log(`  ${fix.date} ${fix.promptId}: ${change}`);
    }
  }
}

if (values.write) {
  await save(animalsPath, animals);
  for (const [name, puzzle] of puzzles) await save(`${PUZZLES}/${name}`, puzzle);
  console.log(`\nWrote ${animalsPath} and ${puzzles.size} puzzle files.`);
} else {
  console.log('\nDry run: nothing written. Add --write to save.');
}
