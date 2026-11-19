import { describe, expect, it } from 'vitest';
import { decideSave, type SaveRequest } from './devPuzzleApi';

const base: SaveRequest = {
  date: '2026-11-25',
  body: '{"date":"2026-11-25"}',
  today: '2026-11-19',
  isDateKey: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v),
  validate: () => {},
};

describe('decideSave', () => {
  it('saves a valid future day', () => {
    expect(decideSave(base)).toEqual({
      status: 200,
      message: 'saved public/data/puzzles/2026-11-25.json',
      json: { date: '2026-11-25' },
    });
  });

  it.each<[string, Partial<SaveRequest>, number, RegExp]>([
    ['a bad date', { date: '../animals' }, 400, /not a date/],
    ['today (live)', { date: '2026-11-19' }, 409, /gone live.*frozen/],
    ['a past day', { date: '2026-11-01' }, 409, /gone live/],
    ['a body that is not JSON', { body: '{oops' }, 400, /not JSON/],
    [
      'an invalid puzzle',
      {
        validate: () => {
          throw new Error('data/puzzles/2026-11-25.json: prompts must have 1 to 7 prompts');
        },
      },
      422,
      /1 to 7 prompts/,
    ],
  ])('refuses %s', (_name, change, status, message) => {
    const decision = decideSave({ ...base, ...change });
    expect(decision.status).toBe(status);
    expect(decision.message).toMatch(message);
    expect(decision).not.toHaveProperty('json');
  });
});
