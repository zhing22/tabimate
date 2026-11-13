import { describe, expect, it, vi } from 'vitest';
import { createJsonLoader, loadRequired, MISSING } from './jsonLoader';
import { ANIMALS_FILE } from './localPuzzleSource';
import {
  loadSpriteArt,
  MASTER_PALETTE_FILE,
  PALETTES_FILE,
  SPRITE_MANIFEST_FILE,
} from './spriteArtSource';

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });

const urlOf = (input: RequestInfo | URL) =>
  input instanceof Request ? input.url : input.toString();

/** A fetch serving `files` (path under public/ -> JSON), 404 for anything else. */
function fakeFetch(files: Record<string, unknown>) {
  return vi.fn((input: RequestInfo | URL) => {
    const path = urlOf(input).replace(/^\/base\//, '');
    return Promise.resolve(path in files ? json(files[path]) : new Response('', { status: 404 }));
  });
}

describe('createJsonLoader', () => {
  it('fetches and parses each file once, shared by every caller', async () => {
    const fetch = fakeFetch({ 'data/a.json': { a: 1 } });
    const loader = createJsonLoader({ baseUrl: '/base', fetch });
    const [first, second] = await Promise.all([
      loader.load('data/a.json'),
      loader.load('data/a.json'),
    ]);
    expect(first).toEqual({ a: 1 });
    expect(second).toBe(first);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(loader.url('x.png')).toBe('/base/x.png');
  });

  it('returns MISSING for a 404, and loadRequired names the missing file', async () => {
    const loader = createJsonLoader({ baseUrl: '/base', fetch: fakeFetch({}) });
    expect(await loader.load('data/none.json')).toBe(MISSING);
    await expect(loadRequired(loader, 'data/none.json')).rejects.toThrow(
      'data/none.json: was not found',
    );
  });

  it('retries a file whose load failed', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(json([1]));
    const loader = createJsonLoader({ baseUrl: '/base', fetch });
    await expect(loader.load('a.json')).rejects.toThrow('could not be fetched');
    expect(await loader.load('a.json')).toEqual([1]);
  });
});

describe('loadSpriteArt', () => {
  const SIX = ['#000000', '#111111', '#222222', '#333333', '#444444', '#555555'];
  const files = {
    [PALETTES_FILE]: { tiger: SIX },
    [MASTER_PALETTE_FILE]: ['#000000'],
    [ANIMALS_FILE]: [{ id: 'tiger', palette: 'tiger' }, { id: 'koala' }],
    [SPRITE_MANIFEST_FILE]: ['big-cat'],
  };

  it('reads palettes, master palette, animal colours and the sheet list', async () => {
    const art = await loadSpriteArt(
      createJsonLoader({ baseUrl: '/base', fetch: fakeFetch(files) }),
    );
    expect(art.palettes.get('tiger')).toEqual(SIX);
    expect(art.master).toEqual(['#000000']);
    expect([...art.animals.keys()]).toEqual(['tiger']);
    expect(art.sheets).toEqual(['big-cat']);
  });

  it('shares animals.json with the puzzle source: one fetch for both', async () => {
    const fetch = fakeFetch(files);
    const loader = createJsonLoader({ baseUrl: '/base', fetch });
    await loader.load(ANIMALS_FILE); // as the puzzle source does
    await loadSpriteArt(loader);
    const animalFetches = fetch.mock.calls.filter(([url]) => urlOf(url).endsWith(ANIMALS_FILE));
    expect(animalFetches).toHaveLength(1);
  });

  it('fails clearly if a file is missing', async () => {
    const rest = Object.fromEntries(
      Object.entries(files).filter(([file]) => file !== SPRITE_MANIFEST_FILE),
    );
    const loader = createJsonLoader({ baseUrl: '/base', fetch: fakeFetch(rest) });
    await expect(loadSpriteArt(loader)).rejects.toThrow(`${SPRITE_MANIFEST_FILE}: was not found`);
  });
});
