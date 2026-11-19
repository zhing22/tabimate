import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { decideSave, type SaveRequest } from './devPuzzleApi';
import { MAX_BODY_BYTES, readBody } from './readBody';

const base: SaveRequest = {
  date: '2026-11-25',
  body: '{"date":"2026-11-25"}',
  contentType: 'application/json',
  origin: 'http://localhost:5173',
  host: 'localhost:5173',
  today: '2026-11-19',
  isDateKey: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v),
  problems: () => [],
};

describe('decideSave', () => {
  it('saves a valid future day sent by the dev server itself', () => {
    expect(decideSave(base)).toEqual({
      status: 200,
      message: 'saved public/data/puzzles/2026-11-25.json',
      json: { date: '2026-11-25' },
    });
    expect(decideSave({ ...base, contentType: 'application/json; charset=utf-8' }).status).toBe(
      200,
    );
  });

  it.each<[string, Partial<SaveRequest>, number, RegExp]>([
    // A cross-site page can send text/plain or a form with no preflight.
    ['text/plain', { contentType: 'text/plain' }, 415, /must be application\/json/],
    ['a form post', { contentType: 'application/x-www-form-urlencoded' }, 415, /application\/json/],
    ['no Content-Type', { contentType: undefined }, 415, /application\/json/],
    ['another origin', { origin: 'https://evil.example' }, 403, /from this dev server/],
    ['no Origin', { origin: undefined }, 403, /Origin missing/],
    ['an origin on another port', { origin: 'http://localhost:9999' }, 403, /dev server/],
    ['a bad date', { date: '../animals' }, 400, /not a date/],
    ['today (live)', { date: '2026-11-19' }, 409, /gone live.*frozen/],
    ['a past day', { date: '2026-11-01' }, 409, /gone live/],
    ['a body that is not JSON', { body: '{oops' }, 400, /not JSON/],
    [
      'a validator error',
      { problems: () => ['data/puzzles/2026-11-25.json: prompts must have 1 to 7 prompts'] },
      422,
      /1 to 7 prompts/,
    ],
    [
      'a name collision, as validate-data reports it',
      { problems: () => ['prompts[0] (p): alias "foxes" of "red-fox" resolves to "fox" by exact'] },
      422,
      /resolves to "fox"/,
    ],
  ])('refuses %s', (_name, change, status, message) => {
    const decision = decideSave({ ...base, ...change });
    expect(decision.status).toBe(status);
    expect(decision.message).toMatch(message);
    expect(decision).not.toHaveProperty('json');
  });
});

describe('readBody', () => {
  it('reads a body up to the limit', async () => {
    expect(await readBody(Readable.from([Buffer.from('{"a":'), Buffer.from('1}')]))).toBe(
      '{"a":1}',
    );
  });

  it('stops at the limit and gives null (the handler replies 413)', async () => {
    const big = Readable.from([Buffer.alloc(MAX_BODY_BYTES), Buffer.alloc(10)]);
    expect(await readBody(big)).toBeNull();
    expect(await readBody(Readable.from([Buffer.alloc(11)]), 10)).toBeNull();
  });
});
