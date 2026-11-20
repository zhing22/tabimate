import { describe, expect, it, vi } from 'vitest';
import { BONUS } from '@/config/bonus';
import { puzzleNumber } from '@/core/date';
import { DataError } from './dataError';
import { createLocalPuzzleSource } from './localPuzzleSource';
import { fixtureAnimals, fixturePuzzle } from './testFixtures';
import { validateBonus } from './validateBonus';

const SUNDAY = '2026-11-22';
const quiz = (overrides: Record<string, unknown> = {}) => ({
  date: SUNDAY,
  items: [
    { statement: 'Bats are blind.', answer: false, explanation: 'Most bats see well.' },
    {
      statement: 'An octopus has three hearts.',
      answer: true,
      explanation: 'Two serve the gills.',
    },
    { statement: 'Flamingos are pink.', answer: true, explanation: 'From the food they eat.' },
  ],
  ...overrides,
});
const read = (json: unknown) => () => validateBonus(json, 'data/bonus/x.json', SUNDAY);

describe('validateBonus', () => {
  it('reads a quiz of statements, answers and explanations', () => {
    expect(read(quiz())()).toHaveLength(BONUS.questions);
  });

  it.each<[string, unknown]>([
    ['another date', quiz({ date: '2026-11-29' })],
    ['too few questions', quiz({ items: quiz().items.slice(1) })],
    ['too many questions', quiz({ items: [...quiz().items, quiz().items[0]] })],
    [
      'an answer that is not true or false',
      quiz({ items: [{ ...quiz().items[0], answer: 'no' }, ...quiz().items.slice(1)] }),
    ],
    [
      'an empty statement',
      quiz({ items: [{ ...quiz().items[0], statement: ' ' }, ...quiz().items.slice(1)] }),
    ],
    [
      `an explanation over ${BONUS.explanationWords} words`,
      quiz({
        items: [
          {
            ...quiz().items[0],
            explanation: Array(BONUS.explanationWords + 1)
              .fill('word')
              .join(' '),
          },
          ...quiz().items.slice(1),
        ],
      }),
    ],
  ])('rejects %s', (_name, json) => {
    expect(read(json)).toThrow(DataError);
  });
});

describe('the puzzle source on a quiz day', () => {
  const json = (body: unknown) =>
    new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
  const sourceFor = (key: string, withQuiz: boolean) => {
    const routes: Record<string, () => Response> = {
      '/data/animals.json': () => json(fixtureAnimals()),
      [`/data/puzzles/${key}.json`]: () =>
        json({ ...fixturePuzzle(), date: key, number: puzzleNumber(key) }),
      ...(withQuiz ? { [`/data/bonus/${key}.json`]: () => json(quiz({ date: key })) } : {}),
    };
    const fetch = vi.fn((url: RequestInfo | URL) => {
      const route = routes[typeof url === 'string' ? url : url instanceof URL ? url.href : url.url];
      return Promise.resolve(route ? route() : new Response('', { status: 404 }));
    });
    return { source: createLocalPuzzleSource({ baseUrl: '/', fetch }), fetch };
  };

  it("attaches Sunday's quiz to the puzzle", async () => {
    const { source } = sourceFor(SUNDAY, true);
    expect((await source.getPuzzle(SUNDAY))?.bonus).toHaveLength(BONUS.questions);
  });

  it('plays without a quiz when its file is missing, and never asks for one on other days', async () => {
    expect((await sourceFor(SUNDAY, false).source.getPuzzle(SUNDAY))?.bonus).toBeUndefined();
    const saturday = sourceFor('2026-11-21', true);
    expect((await saturday.source.getPuzzle('2026-11-21'))?.bonus).toBeUndefined();
    expect(saturday.fetch).not.toHaveBeenCalledWith(
      '/data/bonus/2026-11-21.json',
      expect.anything(),
    );
  });
});
