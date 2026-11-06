import { describe, expect, it } from 'vitest';
import { DataError } from './dataError';
import { FIXTURE_KEY, fixtureAnimals, fixturePuzzle } from './testFixtures';
import { validateAnimals, validatePuzzle } from './validate';

const ANIMALS = 'data/animals.json';
const PUZZLE = `data/puzzles/${FIXTURE_KEY}.json`;

type Json = Record<string, unknown>;
const registry = () => validateAnimals(fixtureAnimals(), ANIMALS);
const checkPuzzle = (json: unknown) =>
  validatePuzzle(json, { file: PUZZLE, key: FIXTURE_KEY, animals: registry() });

/** Expects a DataError naming the file and field, with the problem in the message. */
function expectDataError(run: () => unknown, file: string, field: string | null, problem: RegExp) {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(DataError);
    const e = error as DataError;
    expect(e.file).toBe(file);
    expect(e.field).toBe(field);
    expect(e.message).toContain(file);
    if (field) expect(e.message).toContain(field);
    expect(e.message).toMatch(problem);
    return;
  }
  throw new Error('expected a DataError');
}

describe('validateAnimals', () => {
  it('builds a registry keyed by id', () => {
    const animals = registry();
    expect([...animals.keys()]).toEqual(['red-fox', 'killer-whale', 'platypus']);
    expect(animals.get('killer-whale')?.aliases).toEqual(['orca']);
  });

  it.each<[string, (list: Json[]) => unknown, string | null, RegExp]>([
    ['not an array', () => ({}), null, /must be an array/],
    ['empty', () => [], null, /at least one animal/],
    ['entry not an object', (l) => [...l, 'cat'], '[3]', /must be an object/],
    ['missing display', (l) => (delete l[1]!.display, l), '[1].display', /non-empty string/],
    ['bad id', (l) => ((l[0]!.id = 'Red Fox'), l), '[0].id', /lowercase-with-dashes/],
    ['duplicate id', (l) => ((l[2]!.id = 'red-fox'), l), '[2].id', /duplicate/],
    ['bad movement', (l) => ((l[0]!.movement = 'fly'), l), '[0].movement', /one of "land"/],
    ['bad size', (l) => ((l[0]!.size = 'XL'), l), '[0].size', /one of "S"/],
    ['bad tint', (l) => ((l[1]!.tint = 'black'), l), '[1].tint', /#rrggbb/],
    ['alias not a string', (l) => ((l[1]!.aliases = ['orca', 3]), l), '[1].aliases[1]', /string/],
    [
      'alias clash',
      (l) => ((l[2]!.aliases = ['Orca']), l),
      '[2].aliases[0]',
      /used by "killer-whale"/,
    ],
    ['display clash', (l) => ((l[2]!.display = 'fox'), l), '[2].display', /used by "red-fox"/],
  ])('rejects %s', (_name, mutate, field, problem) => {
    const json = mutate(fixtureAnimals());
    expectDataError(() => validateAnimals(json, ANIMALS), ANIMALS, field, problem);
  });
});

describe('validatePuzzle', () => {
  it('accepts a valid puzzle', () => {
    const puzzle = checkPuzzle(fixturePuzzle());
    expect(puzzle.date).toBe(FIXTURE_KEY);
    expect(puzzle.prompts).toHaveLength(3);
    expect(puzzle.prompts[2]?.answers).toEqual([
      { animalId: 'red-fox', tier: 1 },
      { animalId: 'killer-whale', tier: 1 },
    ]);
  });

  type Puzzle = ReturnType<typeof fixturePuzzle> & Json;
  it.each<[string, (p: Puzzle) => unknown, string | null, RegExp]>([
    ['not an object', () => [], null, /must be an object/],
    ['date not matching the file', (p) => ((p.date = '2026-11-08'), p), 'date', /requested key/],
    ['wrong number', (p) => ((p.number = 99), p), 'number', /is puzzle 2/],
    ['too few prompts', (p) => (p.prompts.pop(), p), 'prompts', /must have 3 prompts/],
    [
      'unknown animal',
      (p) => ((p.prompts[1]!.answers[0]!.animalId = 'dodo'), p),
      'prompts[1].answers[0].animalId',
      /"dodo" is not in the animal registry/,
    ],
    [
      'tier 0 answer',
      (p) => (((p.prompts[0]!.answers[0] as Json).tier = 0), p),
      'prompts[0].answers[0].tier',
      /one of 1, 2, 3, 4, 5/,
    ],
    [
      'same animal twice',
      (p) => ((p.prompts[2]!.answers[1]!.animalId = 'red-fox'), p),
      'prompts[2].answers[1].animalId',
      /listed twice/,
    ],
    ['no answers', (p) => ((p.prompts[0]!.answers = []), p), 'prompts[0].answers', /at least one/],
    ['empty text', (p) => ((p.prompts[1]!.text = ' '), p), 'prompts[1].text', /non-empty/],
    ['duplicate prompt id', (p) => ((p.prompts[2]!.id = 'ocean'), p), 'prompts[2].id', /duplicate/],
  ])('rejects %s', (_name, mutate, field, problem) => {
    const json = mutate(fixturePuzzle());
    expectDataError(() => checkPuzzle(json), PUZZLE, field, problem);
  });
});
