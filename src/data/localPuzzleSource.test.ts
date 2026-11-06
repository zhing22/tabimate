import { describe, expect, it, vi } from 'vitest';
import { DataError } from './dataError';
import { createLocalPuzzleSource } from './localPuzzleSource';
import { FIXTURE_KEY, fixtureAnimals, fixturePuzzle } from './testFixtures';

const BASE = '/tabimate/';
const ANIMALS_URL = `${BASE}data/animals.json`;
const PUZZLE_URL = `${BASE}data/puzzles/${FIXTURE_KEY}.json`;

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
const html = () => new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } });
const status = (code: number) => new Response('', { status: code });

const urlOf = (input: RequestInfo | URL): string =>
  typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

/** A fake fetch serving fixed responses by URL (404 for anything else). */
function fakeFetch(routes: Record<string, () => Response>) {
  return vi.fn((input: RequestInfo | URL) => {
    const route = routes[urlOf(input)];
    return Promise.resolve(route ? route() : status(404));
  });
}

const goodRoutes = () => ({
  [ANIMALS_URL]: () => json(fixtureAnimals()),
  [PUZZLE_URL]: () => json(fixturePuzzle()),
});

describe('createLocalPuzzleSource', () => {
  it('loads and validates the puzzle for a key', async () => {
    const fetch = fakeFetch(goodRoutes());
    const source = createLocalPuzzleSource({ baseUrl: BASE, fetch });

    const puzzle = await source.getPuzzle(FIXTURE_KEY);
    expect(puzzle?.prompts.map((p) => p.id)).toEqual(['lays-eggs', 'ocean', 'eats-meat']);
    expect(fetch).toHaveBeenCalledWith(PUZZLE_URL, expect.anything());
  });

  it('adds the trailing slash to the base URL', async () => {
    const fetch = fakeFetch(goodRoutes());
    await createLocalPuzzleSource({ baseUrl: '/tabimate', fetch }).getAnimals();
    expect(fetch).toHaveBeenCalledWith(ANIMALS_URL, expect.anything());
  });

  it('returns null when the puzzle file does not exist', async () => {
    const fetch = fakeFetch({ [ANIMALS_URL]: () => json(fixtureAnimals()) });
    const source = createLocalPuzzleSource({ baseUrl: BASE, fetch });
    await expect(source.getPuzzle(FIXTURE_KEY)).resolves.toBeNull();
  });

  it('returns null when the host falls back to index.html with a 200', async () => {
    const fetch = fakeFetch({ ...goodRoutes(), [PUZZLE_URL]: html });
    const source = createLocalPuzzleSource({ baseUrl: BASE, fetch });
    await expect(source.getPuzzle(FIXTURE_KEY)).resolves.toBeNull();
  });

  it('rejects with the file name on a server error', async () => {
    const fetch = fakeFetch({ ...goodRoutes(), [PUZZLE_URL]: () => status(500) });
    const source = createLocalPuzzleSource({ baseUrl: BASE, fetch });
    await expect(source.getPuzzle(FIXTURE_KEY)).rejects.toThrow(
      `data/puzzles/${FIXTURE_KEY}.json: could not be fetched (HTTP 500)`,
    );
  });

  it('rejects when the network fails', async () => {
    const fetch = vi.fn(() => Promise.reject(new TypeError('offline')));
    const source = createLocalPuzzleSource({ baseUrl: BASE, fetch });
    await expect(source.getAnimals()).rejects.toThrow(/animals\.json: could not be fetched/);
  });

  it('rejects malformed JSON', async () => {
    const broken = () => new Response('{', { headers: { 'content-type': 'application/json' } });
    const fetch = fakeFetch({ ...goodRoutes(), [PUZZLE_URL]: broken });
    const source = createLocalPuzzleSource({ baseUrl: BASE, fetch });
    await expect(source.getPuzzle(FIXTURE_KEY)).rejects.toThrow(/is not valid JSON/);
  });

  it('rejects invalid puzzle data with a DataError naming the field', async () => {
    const bad = fixturePuzzle();
    bad.prompts[0]!.answers[0]!.animalId = 'dodo';
    const fetch = fakeFetch({ ...goodRoutes(), [PUZZLE_URL]: () => json(bad) });
    const source = createLocalPuzzleSource({ baseUrl: BASE, fetch });

    const error: unknown = await source.getPuzzle(FIXTURE_KEY).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DataError);
    expect((error as DataError).field).toBe('prompts[0].answers[0].animalId');
  });

  it('rejects when animals.json is missing', async () => {
    const fetch = fakeFetch({ [PUZZLE_URL]: () => json(fixturePuzzle()) });
    const source = createLocalPuzzleSource({ baseUrl: BASE, fetch });
    await expect(source.getPuzzle(FIXTURE_KEY)).rejects.toThrow('data/animals.json: was not found');
  });

  it('fetches animals once and caches them', async () => {
    const fetch = fakeFetch(goodRoutes());
    const source = createLocalPuzzleSource({ baseUrl: BASE, fetch });

    await Promise.all([source.getPuzzle(FIXTURE_KEY), source.getAnimals()]);
    await source.getPuzzle(FIXTURE_KEY);
    const animalCalls = fetch.mock.calls.filter(([url]) => urlOf(url) === ANIMALS_URL);
    expect(animalCalls).toHaveLength(1);
  });

  it('does not cache a failed animals load', async () => {
    let attempt = 0;
    const fetch = fakeFetch({
      [ANIMALS_URL]: () => (++attempt === 1 ? status(503) : json(fixtureAnimals())),
    });
    const source = createLocalPuzzleSource({ baseUrl: BASE, fetch });

    await expect(source.getAnimals()).rejects.toThrow(/HTTP 503/);
    await expect(source.getAnimals()).resolves.toHaveProperty('size', 3);
  });

  it('rejects a malformed key without fetching', async () => {
    const fetch = fakeFetch(goodRoutes());
    const source = createLocalPuzzleSource({ baseUrl: BASE, fetch });
    await expect(source.getPuzzle('../animals')).rejects.toThrow(RangeError);
    expect(fetch).not.toHaveBeenCalled();
  });
});
