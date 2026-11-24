// Checks the build's first JavaScript against the budget (config/performance.ts):
// fails above the ceiling, warns above the target. Runs after vite build
// (npm run build).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { BUNDLE_BUDGET } from '../src/config/performance.ts';
import { budgetVerdict, firstScripts } from './lib/bundleBudget.ts';

const DIST = 'dist';
const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const scripts = firstScripts(html);
if (scripts.length === 0)
  throw new Error('dist/index.html loads no module script: was the build run?');

const sizes = scripts.map((src) => {
  const file = join(DIST, src.replace(/^\//, '').replace(/^\.\//, ''));
  return { src, kb: gzipSync(readFileSync(file)).length / 1024 };
});
const total = sizes.reduce((sum, s) => sum + s.kb, 0);
for (const { src, kb } of sizes) console.log(`  ${kb.toFixed(1).padStart(6)} KB  ${src}`);

const verdict = budgetVerdict(total, BUNDLE_BUDGET);
if (verdict.fail) {
  console.error(verdict.message);
  process.exit(1);
}
console.log(verdict.warn ? `Warning: ${verdict.message}` : verdict.message);
