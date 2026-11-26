// Checks the build's JavaScript against the budget (config/performance.ts) and
// prints every chunk, gzipped: the entry chunk, the initial JS (what a first
// visit runs before the start screen) and what loads later. Fails the run
// (npm run build, npm run check) when the entry or the initial JS is over.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { BUNDLE_BUDGET } from '../src/config/performance.ts';
import { budgetProblems, classifyChunks, type ViteManifest } from './lib/bundleBudget.ts';

const DIST = 'dist';
const manifestFile = join(DIST, '.vite', 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestFile, 'utf8')) as ViteManifest;
const kinds = classifyChunks(manifest, BUNDLE_BUDGET.eagerChunks);
const gzipKb = (file: string) => gzipSync(readFileSync(join(DIST, file))).length / 1024;
const rows = [...kinds]
  .map(([file, kind]) => ({ file, kind, kb: gzipKb(file) }))
  .sort((a, b) => a.kind.localeCompare(b.kind) || b.kb - a.kb);

const sum = (kind: string) => rows.filter((r) => r.kind === kind).reduce((s, r) => s + r.kb, 0);
const entryKb = sum('entry');
const initialKb = entryKb + sum('initial');
const kb = (n: number) => n.toFixed(1).padStart(7);

console.log('  gzip KB  kind     chunk');
for (const row of rows) console.log(`  ${kb(row.kb)}  ${row.kind.padEnd(7)}  ${row.file}`);
console.log(`  ${kb(entryKb)}  entry chunk (budget ${BUNDLE_BUDGET.entryKb})`);
console.log(`  ${kb(initialKb)}  initial JS (budget ${BUNDLE_BUDGET.initialKb})`);
console.log(`  ${kb(sum('lazy'))}  loaded on demand`);

const problems = budgetProblems(entryKb, initialKb, BUNDLE_BUDGET);
if (problems.length > 0) {
  for (const problem of problems) console.error(problem);
  console.error('Load more lazily rather than raising the budget.');
  process.exit(1);
}
console.log('Within budget.');
