import { describe, expect, it, vi } from 'vitest';
import { savePuzzle } from './exporting';
import { emptyDraft } from './puzzleFile';

const draft = emptyDraft('2026-11-25');
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('savePuzzle', () => {
  it('posts the puzzle as JSON and reports the save', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(() =>
      Promise.resolve(json(200, { message: 'saved public/data/puzzles/2026-11-25.json' })),
    );
    expect(await savePuzzle(draft, fetch)).toEqual({
      ok: true,
      text: 'Saved: saved public/data/puzzles/2026-11-25.json',
    });
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe('/__dev/puzzles/2026-11-25');
    expect(init).toMatchObject({ method: 'POST', headers: { 'Content-Type': 'application/json' } });
  });

  it.each<[string, () => Promise<Response>, RegExp]>([
    [
      'a refusal',
      () => Promise.resolve(json(409, { message: 'has gone live' })),
      /^Not saved: has gone live$/,
    ],
    [
      'a network error',
      () => Promise.reject(new TypeError('Failed to fetch')),
      /^Not saved: the dev server can't be reached/,
    ],
    // vite preview has no API: it answers with the HTML page.
    [
      'an HTML reply',
      () => Promise.resolve(new Response('<!doctype html>', { status: 200 })),
      /^Not saved: unexpected reply \(HTTP 200\)/,
    ],
    [
      'JSON without a message',
      () => Promise.resolve(json(500, { oops: true })),
      /^Not saved: unexpected reply \(HTTP 500\)/,
    ],
  ])('never throws on %s', async (_name, reply, text) => {
    const result = await savePuzzle(draft, () => reply());
    expect(result.ok).toBe(false);
    expect(result.text).toMatch(text);
  });
});
