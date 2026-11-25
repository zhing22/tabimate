// Polite HTTP for the content scripts: at most one request per interval, every
// response cached on disk (so a rerun costs nothing and drafts are reproducible),
// and a descriptive User-Agent as Wikimedia asks. Contact details are not built
// in; set TABIMATE_CONTACT (an email or URL) to add them to the User-Agent.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const userAgent = (contact = process.env.TABIMATE_CONTACT): string =>
  `TabimateContentScripts/0.1 (animal trivia game data drafting${contact ? `; ${contact}` : ''})`;

const RETRY_STATUS = new Set([429, 502, 503, 504]);
const MAX_RETRIES = 3;
const BACKOFF_MS = 5000;

export interface FetcherOptions {
  readonly cacheDir: string;
  /** Minimum gap between network requests. Cache hits don't wait. */
  readonly intervalMs?: number;
  /** Injected for tests. */
  readonly fetch?: typeof fetch;
  readonly now?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
}

export interface Fetcher {
  /** GET (or POST with a form body) returning parsed JSON, or null for a 404. */
  json(url: string, form?: Record<string, string>): Promise<unknown>;
  /** How many requests went to the network (not the cache). */
  readonly requests: () => number;
}

export function createFetcher(options: FetcherOptions): Fetcher {
  const { cacheDir, intervalMs = 1000 } = options;
  const doFetch = options.fetch ?? fetch;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  let last = -Infinity;
  let count = 0;
  mkdirSync(cacheDir, { recursive: true });

  return {
    requests: () => count,
    async json(url, form) {
      const body = form ? new URLSearchParams(form).toString() : undefined;
      const key = createHash('sha256')
        .update(`${url}\n${body ?? ''}`)
        .digest('hex')
        .slice(0, 24);
      const file = join(cacheDir, `${key}.json`);
      if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')) as unknown;

      const wait = last + intervalMs - now();
      if (wait > 0) await sleep(wait);
      const request = () => {
        last = now();
        count++;
        return doFetch(url, {
          method: body ? 'POST' : 'GET',
          headers: {
            'User-Agent': userAgent(),
            Accept: 'application/json, application/sparql-results+json',
            ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
          },
          ...(body ? { body } : {}),
        });
      };
      let response = await request();
      // Rate limited or busy: wait as told (Retry-After, in seconds), else back off.
      for (let attempt = 0; RETRY_STATUS.has(response.status) && attempt < MAX_RETRIES; attempt++) {
        const told = Number(response.headers.get('Retry-After'));
        await sleep(told > 0 ? told * 1000 : BACKOFF_MS * 2 ** attempt);
        response = await request();
      }
      if (response.status === 404) {
        writeFileSync(file, 'null');
        return null;
      }
      if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
      const data: unknown = await response.json();
      writeFileSync(file, JSON.stringify(data));
      return data;
    },
  };
}
