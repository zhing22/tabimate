// What a visit downloads before the start screen: npm run measure:start
// (after npm run build). Serves dist/ with vite preview, opens a fresh
// browser (no cache, no service worker yet) at a phone size, and counts every
// request until the Play button shows, by kind, with transferred bytes.
// --repeat: then a second visit (the service worker in control) and an
// offline one, which must still reach the start screen.
// --list prints each request; --date YYYY-MM-DD plays that day (?debug=1).
import { chromium, type Page, type Request } from '@playwright/test';
import { preview } from 'vite';

const PORT = 4179;
const args = process.argv.slice(2);
const dateArg = args.indexOf('--date');
const date = dateArg >= 0 ? args[dateArg + 1] : undefined;
const url = `http://localhost:${PORT}/${date ? `?debug=1&date=${date}` : ''}`;

/** A request's kind for the table: the resource type, or font, data or sprite by path. */
function kind(request: Request): string {
  const path = new URL(request.url()).pathname;
  if (/\.woff2?$/.test(path)) return 'font';
  if (path.includes('/data/')) return 'data';
  if (path.includes('/sprites/')) return 'sprite';
  return request.resourceType();
}

/** Loads the page (or reloads it) and reports what it fetched until Play showed. */
async function visit(page: Page, label: string, reload: boolean): Promise<void> {
  const requests: Request[] = [];
  const errors: string[] = [];
  const onRequest = (r: Request) => requests.push(r);
  const onConsole = (m: { type(): string; text(): string }) =>
    m.type() === 'error' ? errors.push(m.text()) : undefined;
  page.on('request', onRequest);
  page.on('console', onConsole);
  const started = Date.now();
  await (reload ? page.reload() : page.goto(url));
  await page.getByRole('button', { name: 'Play', exact: true }).waitFor({ timeout: 30_000 });
  const ms = Date.now() - started;
  page.off('request', onRequest);
  page.off('console', onConsole);
  const rows = new Map<string, { count: number; bytes: number; worker: number }>();
  for (const request of requests) {
    const sizes = await request.sizes().catch(() => null);
    const response = await request.response();
    const row = rows.get(kind(request)) ?? { count: 0, bytes: 0, worker: 0 };
    row.count += 1;
    row.bytes += sizes ? sizes.responseBodySize + sizes.responseHeadersSize : 0;
    if (response?.fromServiceWorker()) row.worker += 1;
    rows.set(kind(request), row);
  }
  console.log(`${label}: ${requests.length} requests before the start screen (${ms} ms, local)`);
  for (const [name, row] of [...rows].sort((a, b) => b[1].count - a[1].count)) {
    const kb = (row.bytes / 1024).toFixed(1).padStart(8);
    console.log(
      `  ${String(row.count).padStart(4)}  ${kb} KB  ${name} (${row.worker} from the service worker)`,
    );
  }
  if (args.includes('--list')) for (const r of requests) console.log(`  ${kind(r)}  ${r.url()}`);
  for (const error of errors) console.log(`  console error: ${error}`);
}

const server = await preview({ preview: { port: PORT, strictPort: true }, logLevel: 'error' });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await visit(page, 'First visit', false);
  if (args.includes('--repeat')) {
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
    await visit(page, 'Second visit', true);
    await context.setOffline(true);
    await visit(page, 'Offline visit', true);
  }
} finally {
  await browser.close();
  server.httpServer.close();
}
