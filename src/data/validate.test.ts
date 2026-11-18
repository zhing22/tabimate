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
    [
      'name too long to type',
      (l) => ((l[1]!.aliases = ['orca', 'x'.repeat(41)]), l),
      '[1].aliases[1]',
      /longer than MAX_INPUT_LENGTH \(40\)/,
    ],
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
      { animalId: 'red-fox', level: 1 },
      { animalId: 'killer-whale', level: 5 },
    ]);
  });

  it('accepts fewer prompts than PROMPTS_PER_DAY, so older files stay valid', () => {
    const json = fixturePuzzle();
    json.prompts.splice(1);
    expect(checkPuzzle(json).prompts).toHaveLength(1);
  });

  type Puzzle = ReturnType<typeof fixturePuzzle> & Json;
  it.each<[string, (p: Puzzle) => unknown, string | null, RegExp]>([
    ['not an object', () => [], null, /must be an object/],
    ['date not matching the file', (p) => ((p.date = '2026-11-08'), p), 'date', /requested key/],
    ['wrong number', (p) => ((p.number = 99), p), 'number', /is puzzle 2/],
    ['missing date', (p) => (delete (p as Json).date, p), 'date', /non-empty string/],
    ['non-integer number', (p) => ((p.number = 2.5), p), 'number', /must be an integer/],
    ['number as a string', (p) => (((p as Json).number = '2'), p), 'number', /must be an integer/],
    ['no prompts', (p) => ((p.prompts = []), p), 'prompts', /must have 1 to 7 prompts \(got 0\)/],
    [
      'too many prompts',
      (p) => ((p.prompts = Array.from({ length: 8 }, () => p.prompts[0]!)), p),
      'prompts',
      /must have 1 to 7 prompts \(got 8\)/,
    ],
    [
      'unknown animal',
      (p) => ((p.prompts[1]!.answers[0]!.animalId = 'dodo'), p),
      'prompts[1].answers[0].animalId',
      /"dodo" is not in the animal registry/,
    ],
    [
      'level 0 answer',
      (p) => (((p.prompts[0]!.answers[0] as Json).level = 0), p),
      'prompts[0].answers[0].level',
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

/** The fixture animals plus a "canid" group over the red fox. */
const withGroup = (list: Json[] = fixtureAnimals()): Json[] => {
  list[0]!.parent = 'canid';
  return [
    ...list,
    {
      id: 'canid',
      display: 'Canid',
      aliases: ['dog family'],
      archetype: 'canine',
      movement: 'land',
      size: 'M',
      tint: '#d86a28',
      emoji: 'x',
      kind: 'group',
      representative: 'red-fox',
    },
  ];
};

describe('validateAnimals: groups and extra fields', () => {
  it('accepts a group over a species, with the optional fields', () => {
    const list = withGroup();
    Object.assign(list[1]!, {
      description: 'The largest dolphin, a black and white hunter of every ocean.',
      descriptionReviewed: false,
      wiki: 'https://en.wikipedia.org/wiki/Orca',
      traits: { class: 'mammal', diet: ['carnivore'], depthM: [0, 300], flies: false },
    });
    const animals = validateAnimals(list, ANIMALS);
    expect(animals.get('red-fox')?.parent).toBe('canid');
    expect(animals.get('canid')?.representative).toBe('red-fox');
    expect(animals.get('killer-whale')?.traits).toEqual({
      class: 'mammal',
      diet: ['carnivore'],
      depthM: [0, 300],
      flies: false,
    });
    expect(animals.get('platypus')).not.toHaveProperty('traits');
  });

  it.each<[string, (list: Json[]) => unknown, string, RegExp]>([
    ['missing kind', (l) => (delete l[2]!.kind, l), '[2].kind', /one of "group", "species"/],
    ['unknown parent', (l) => ((l[2]!.parent = 'mole'), l), '[2].parent', /not in the animal/],
    ['species as parent', (l) => ((l[2]!.parent = 'red-fox'), l), '[2].parent', /is a species/],
    [
      'a parent loop',
      (l) => (
        Object.assign(l[3]!, { parent: 'pack' }),
        [...l, { ...l[3], id: 'pack', display: 'Pack', aliases: [], parent: 'canid' }]
      ),
      '[3].parent',
      /leads back to "canid"/,
    ],
    [
      'group without a representative',
      (l) => (delete l[3]!.representative, l),
      '[3].representative',
      /must be set for a group/,
    ],
    [
      'representative on a species',
      (l) => ((l[2]!.representative = 'red-fox'), l),
      '[2].representative',
      /only for groups/,
    ],
    [
      'representative outside the group',
      (l) => ((l[3]!.representative = 'platypus'), l),
      '[3].representative',
      /must be a species under "canid"/,
    ],
    [
      'unknown representative',
      (l) => ((l[3]!.representative = 'dodo'), l),
      '[3].representative',
      /not in the animal registry/,
    ],
    ['bad trait', (l) => ((l[0]!.traits = { diet: ['meat'] }), l), '[0].traits.diet[0]', /one of/],
    ['unknown trait', (l) => ((l[0]!.traits = { wings: 2 }), l), '[0].traits.wings', /not a known/],
    [
      'backwards range',
      (l) => ((l[0]!.traits = { altitudeM: [900, 0] }), l),
      '[0].traits.altitudeM',
      /min 900 is more than max 0/,
    ],
    [
      'long description',
      (l) => ((l[0]!.description = Array.from({ length: 16 }, () => 'word').join(' ')), l),
      '[0].description',
      /has 16 words \(at most 15\)/,
    ],
    ['plain-http wiki', (l) => ((l[0]!.wiki = 'http://x.org'), l), '[0].wiki', /https:\/\//],
  ])('rejects %s', (_name, mutate, field, problem) => {
    const json = mutate(withGroup());
    expectDataError(() => validateAnimals(json, ANIMALS), ANIMALS, field, problem);
  });
});

describe('validatePuzzle: levels', () => {
  type Answer = { animalId: string; level: number };
  const grouped = () => validateAnimals(withGroup(), ANIMALS);
  const eatsMeat = (answers: Answer[]) => {
    const json = fixturePuzzle();
    json.prompts[2]!.answers = answers;
    return json;
  };
  const check = (json: unknown, extra: { maxCR?: number; warn?: (m: string) => void } = {}) =>
    validatePuzzle(json, { file: PUZZLE, key: FIXTURE_KEY, animals: grouped(), ...extra });

  it('rejects a prompt with two CR answers', () => {
    const json = eatsMeat([
      { animalId: 'red-fox', level: 5 },
      { animalId: 'killer-whale', level: 5 },
    ]);
    expectDataError(
      () => check(json),
      PUZZLE,
      'prompts[2].answers',
      /exactly one level-5 \(CR\) answer \(got 2\)/,
    );
  });

  it('rejects a prompt with no CR answer', () => {
    const json = eatsMeat([{ animalId: 'red-fox', level: 4 }]);
    expectDataError(() => check(json), PUZZLE, 'prompts[2].answers', /exactly one.*\(got 0\)/);
  });

  it("allows up to the theme's maxCR", () => {
    const two = eatsMeat([
      { animalId: 'red-fox', level: 5 },
      { animalId: 'killer-whale', level: 5 },
    ]);
    expect(check(two, { maxCR: 2 }).prompts[2]?.answers).toHaveLength(2);
    expectDataError(
      () => check(eatsMeat([{ animalId: 'red-fox', level: 3 }]), { maxCR: 2 }),
      PUZZLE,
      'prompts[2].answers',
      /1 to 2 level-5 \(CR\) answers \(got 0\)/,
    );
  });

  it('warns, without failing, when a species is below its own group', () => {
    const warnings: string[] = [];
    const json = eatsMeat([
      { animalId: 'canid', level: 3 },
      { animalId: 'red-fox', level: 2 },
      { animalId: 'killer-whale', level: 5 },
    ]);
    expect(() => check(json, { warn: (m) => warnings.push(m) })).not.toThrow();
    expect(warnings).toEqual([
      `${PUZZLE}: prompts[2].answers[1].level "red-fox" is level 2 (NT), below its group "canid" at level 3 (VU)`,
    ]);
  });

  it('does not warn when the group is the lower level', () => {
    const warnings: string[] = [];
    const json = eatsMeat([
      { animalId: 'canid', level: 1 },
      { animalId: 'red-fox', level: 5 },
    ]);
    check(json, { warn: (m) => warnings.push(m) });
    expect(warnings).toEqual([]);
  });
});
