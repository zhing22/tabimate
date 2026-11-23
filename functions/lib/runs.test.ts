import { describe, expect, it } from 'vitest';
import { STATS } from '../../src/config/stats';
import { checkAgainstPuzzle, readPuzzleAnswers } from './puzzleCheck';
import { acceptedDates, parseRunBody } from './runBody';
import { dayStatsFrom, dayStatsQuery, INSERT_RUN, insertRun } from './sql';

const TODAY = '2026-11-23';
const DEVICE = '0f8fad5b-d9cb-469f-a165-70867728950e';
const body = (over: Record<string, unknown> = {}) => ({
  deviceId: DEVICE,
  dateKey: TODAY,
  answers: [
    { promptId: 'p1', answerId: 'tiger' },
    { promptId: 'p2', answerId: null },
  ],
  ...over,
});

describe('parseRunBody', () => {
  it("accepts a well-formed run for today's or yesterday's puzzle", () => {
    expect(acceptedDates(TODAY)).toEqual([TODAY, '2026-11-22']);
    const run = parseRunBody(body(), TODAY);
    expect(run).toEqual({ ok: true, value: body() });
    expect(parseRunBody(body({ dateKey: '2026-11-22' }), TODAY).ok).toBe(true);
  });

  it.each([
    ['not an object', [] as unknown],
    ['a device id that is not a UUID', body({ deviceId: 'me@example.com' })],
    ['a bad date', body({ dateKey: '23/11/2026' })],
    ['an old day', body({ dateKey: '2026-11-21' })],
    ['a future day', body({ dateKey: '2026-11-24' })],
    ['no answers', body({ answers: [] })],
    [
      'too many answers',
      body({
        answers: Array.from({ length: STATS.maxAnswers + 1 }, (_, i) => ({
          promptId: `p${i}`,
          answerId: null,
        })),
      }),
    ],
    [
      'a prompt answered twice',
      body({
        answers: [
          { promptId: 'p1', answerId: null },
          { promptId: 'p1', answerId: 'tiger' },
        ],
      }),
    ],
    ['an answer that is not a string', body({ answers: [{ promptId: 'p1', answerId: 7 }] })],
    [
      'an id that is too long',
      body({ answers: [{ promptId: 'p'.repeat(STATS.maxIdLength + 1), answerId: null }] }),
    ],
  ])('refuses %s', (_, value) => {
    expect(parseRunBody(value, TODAY).ok).toBe(false);
  });

  it('stores the device id in one case', () => {
    const run = parseRunBody(body({ deviceId: DEVICE.toUpperCase() }), TODAY);
    expect(run.ok && run.value.deviceId).toBe(DEVICE);
  });
});

describe('checkAgainstPuzzle', () => {
  const puzzle = readPuzzleAnswers({
    date: TODAY,
    prompts: [
      { id: 'p1', answers: [{ animalId: 'tiger', level: 4 }] },
      { id: 'p2', answers: [{ animalId: 'lion', level: 1 }] },
    ],
  })!;

  it("keeps each answer with the file's level, a miss at 0", () => {
    const run = parseRunBody(body(), TODAY);
    if (!run.ok) throw new Error(run.error);
    expect(checkAgainstPuzzle(run.value, puzzle)).toEqual({
      ok: true,
      value: [
        { promptId: 'p1', answerId: 'tiger', level: 4 },
        { promptId: 'p2', answerId: null, level: 0 },
      ],
    });
  });

  it('refuses an answer not on its prompt, or a prompt not on the puzzle', () => {
    const wrong = {
      deviceId: DEVICE,
      dateKey: TODAY,
      answers: [{ promptId: 'p2', answerId: 'tiger' }],
    };
    expect(checkAgainstPuzzle(wrong, puzzle).ok).toBe(false);
    const stray = { ...wrong, answers: [{ promptId: 'p9', answerId: null }] };
    expect(checkAgainstPuzzle(stray, puzzle).ok).toBe(false);
  });

  it('reads only a puzzle-shaped file', () => {
    expect(readPuzzleAnswers(null)).toBeNull();
    expect(readPuzzleAnswers({ prompts: [{ id: 3 }] })).toBeNull();
  });
});

describe('sql', () => {
  it('inserts one row per prompt, every value bound, duplicates ignored', () => {
    const statements = insertRun(
      DEVICE,
      TODAY,
      [{ promptId: 'p1', answerId: 'tiger', level: 4 }],
      99,
    );
    expect(statements).toEqual([
      { sql: INSERT_RUN, params: [DEVICE, TODAY, 'p1', 'tiger', 4, 99] },
    ]);
    expect(INSERT_RUN).toMatch(/^INSERT OR IGNORE INTO runs/);
    expect(INSERT_RUN.split('?')).toHaveLength(7);
  });

  it("counts a day's players per prompt and answer, misses in the players only", () => {
    expect(dayStatsQuery(TODAY)).toEqual({
      sql: expect.stringContaining('WHERE date_key = ?') as string,
      params: [TODAY],
    });
    const stats = dayStatsFrom(TODAY, [
      { prompt_id: 'p1', answer_id: 'tiger', n: 3 },
      { prompt_id: 'p1', answer_id: 'lion', n: 1 },
      { prompt_id: 'p1', answer_id: null, n: 2 },
    ]);
    expect(stats).toEqual({
      dateKey: TODAY,
      prompts: { p1: { players: 6, answers: { tiger: 3, lion: 1 } } },
    });
  });
});
