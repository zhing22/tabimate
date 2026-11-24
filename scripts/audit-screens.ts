// npm run audit:screens [-- --out art/audit/after] [--size 390x844]
// Plays one fixed day in the dev server at every audit size (Playwright,
// Chromium) and writes each state's screenshots plus a contact sheet per state:
// art/audit/{state}.png (sizes side by side), art/audit/{state}/{size}.png, and
// art/audit/report.json (per shot: smallest text, text under 16 px, small tap targets).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { createServer } from 'vite';
import { planAnswers, type AuditPrompt } from './lib/audit/answers';
import { measurePage, type Measured } from './lib/audit/measure';
import { writeContactSheet, type ShotFile } from './lib/audit/contactSheet';
import { auditOneSize, warmUp, type Capture } from './lib/audit/flow';
import {
  AUDIT,
  AUDIT_SIZES,
  AUDIT_STATES,
  sizeName,
  type AuditSize,
  type AuditState,
} from './lib/audit/targets';

function option(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function readPlan() {
  const puzzle = JSON.parse(await readFile(`public/data/puzzles/${AUDIT.date}.json`, 'utf8')) as {
    prompts: AuditPrompt[];
  };
  const animals = JSON.parse(await readFile('public/data/animals.json', 'utf8')) as {
    id: string;
    display: string;
  }[];
  const names = new Map(animals.map((a) => [a.id, a.display]));
  return planAnswers(puzzle.prompts, (id) => names.get(id) ?? id);
}

/** Runs each job, at most `limit` at a time. */
async function pool<T>(items: readonly T[], limit: number, job: (item: T) => Promise<void>) {
  const queue = [...items];
  const worker = async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) await job(item);
  };
  await Promise.all(Array.from({ length: limit }, worker));
}

/** What one audit collects: screenshots by state, and each shot's measurements. */
function collector(outDir: string) {
  const shots = new Map<AuditState, ShotFile[]>(AUDIT_STATES.map((s) => [s, []]));
  const report: Record<string, Record<string, Measured>> = {};
  const captureFor =
    (label: string): Capture =>
    async (state, page) => {
      const png = await page.screenshot();
      const { width = 0, height = 0 } = await sharp(png).metadata();
      await mkdir(join(outDir, state), { recursive: true });
      await writeFile(join(outDir, state, `${label}.png`), png);
      shots.get(state)?.push({ label, width, height, png });
      (report[state] ??= {})[label] = await page.evaluate(measurePage, AUDIT.limits);
    };
  const write = async (order: readonly string[]) => {
    for (const [state, list] of shots) {
      if (!list.length) continue;
      list.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
      await writeContactSheet(state, list, join(outDir, `${state}.png`));
    }
    await writeFile(join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  };
  return { captureFor, write };
}

/** Plays the day at every size against a dev server; returns the sizes that stopped. */
async function captureAll(
  sizes: readonly AuditSize[],
  outDir: string,
  captureFor: (label: string) => Capture,
) {
  const plan = await readPlan();
  const server = await createServer({ logLevel: 'error', server: { port: 0 } });
  await server.listen();
  const url = server.resolvedUrls?.local[0];
  if (!url) throw new Error('The dev server has no local URL');
  const browser = await chromium.launch();
  const failures: string[] = [];
  try {
    await warmUp(browser, url);
    await pool(sizes, AUDIT.parallel, async (size) => {
      const label = sizeName(size);
      try {
        await auditOneSize(
          browser,
          url,
          size,
          plan,
          captureFor(label),
          join(outDir, `failed-${label}.png`),
        );
        console.log(`${label}: done`);
      } catch (error) {
        failures.push(label);
        console.error(`${label}: stopped,`, error instanceof Error ? error.message : error);
      }
    });
  } finally {
    await browser.close();
    await server.close();
  }
  return failures;
}

async function main() {
  const outDir = option('out') ?? AUDIT.outDir;
  const only = option('size');
  const sizes = AUDIT_SIZES.filter((s) => !only || sizeName(s) === only);
  await mkdir(outDir, { recursive: true });
  const { captureFor, write } = collector(outDir);
  const failures = await captureAll(sizes, outDir, captureFor);
  await write(sizes.map(sizeName));
  console.log(`Contact sheets and report.json in ${outDir}/`);
  if (failures.length) {
    console.error(`Incomplete: ${failures.join(', ')}`);
    process.exitCode = 1;
  }
}

await main();
