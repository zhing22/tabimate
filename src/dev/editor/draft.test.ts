import { describe, expect, it } from 'vitest';
import type { Animal, AnimalLookup, AnimalTraits, Puzzle } from '@/core/types';
import { checkPuzzle } from './check';
import { emptyDraft, fromPuzzle, SLOT_COUNT, slotAnswers, toPuzzleJson } from './puzzleFile';
import { addAnimal, draftRows, redraftSlot, suggestLevel, toggleCR } from './rows';
import { answerUsage, levelCounts, recentUses } from './stats';
import type { EditorDraft, SlotDraft } from './types';

const make = (
  id: string,
  display: string,
  extra: Partial<Animal> = {},
  traits?: AnimalTraits,
): Animal => ({
  id,
  display,
  aliases: [],
  archetype: 'test',
  movement: 'land',
  size: 'M',
  tint: '#808080',
  emoji: 'x',
  kind: 'species',
  ...extra,
  ...(traits ? { traits } : {}),
});
const animals: AnimalLookup = new Map(
  [
    make(
      'penguin',
      'Penguin',
      { kind: 'group', representative: 'emperor-penguin' },
      { class: 'bird' },
    ),
    make(
      'emperor-penguin',
      'Emperor penguin',
      { parent: 'penguin' },
      { class: 'bird', continent: ['antarctica'] },
    ),
    make('bear', 'Bear', { kind: 'group', representative: 'polar-bear' }),
    make(
      'polar-bear',
      'Polar bear',
      { parent: 'bear' },
      { class: 'mammal', continent: ['north-america'] },
    ),
    make('red-fox', 'Red fox', {}, { class: 'mammal', continent: ['north-america', 'europe'] }),
  ].map((a) => [a.id, a]),
);
const puzzle = (date: string, prompts: Puzzle['prompts']): Puzzle => ({ date, number: 1, prompts });
const usage = answerUsage([
  puzzle('2026-11-10', [
    { id: 'a', text: 'A', answers: [{ animalId: 'red-fox', level: 1 }] },
    { id: 'b', text: 'B', answers: [{ animalId: 'red-fox', level: 1 }] },
    {
      id: 'c',
      text: 'C',
      answers: [
        { animalId: 'red-fox', level: 1 },
        { animalId: 'polar-bear', level: 3 },
      ],
    },
  ]),
]);

describe('suggestLevel', () => {
  it('is 1 for a group, 2 for a common animal, 3 otherwise, never 4 or 5', () => {
    expect(suggestLevel(animals.get('penguin')!, usage)).toBe(1);
    expect(usage.get('red-fox')).toBe(3);
    expect(suggestLevel(animals.get('red-fox')!, usage)).toBe(2);
    expect(suggestLevel(animals.get('polar-bear')!, usage)).toBe(3);
  });
});

describe('draftRows', () => {
  it('lists matches ticked, and the groups above them unticked unless they match too', () => {
    const fromNA = draftRows(
      { op: 'includes', trait: 'continent', value: 'north-america' },
      animals,
      usage,
    );
    expect(fromNA).toEqual([
      { animalId: 'bear', level: 1, include: false }, // contains a match, doesn't match itself
      { animalId: 'red-fox', level: 2, include: true },
      { animalId: 'polar-bear', level: 3, include: true },
    ]);
    const birds = draftRows({ op: 'equals', trait: 'class', value: 'bird' }, animals, usage);
    expect(birds).toEqual([
      { animalId: 'penguin', level: 1, include: true }, // the group matches itself
      { animalId: 'emperor-penguin', level: 3, include: true },
    ]);
  });
});

describe('toggleCR', () => {
  it('acts as a radio button when only one CR is allowed', () => {
    expect(toggleCR([], 'a', 1)).toEqual(['a']);
    expect(toggleCR(['a'], 'b', 1)).toEqual(['b']);
    expect(toggleCR(['a'], 'a', 1)).toEqual(['a']);
  });

  it("toggles up to a theme's maxCR", () => {
    expect(toggleCR(['a'], 'b', 2)).toEqual(['a', 'b']);
    expect(toggleCR(['a', 'b'], 'c', 2)).toEqual(['a', 'b']);
    expect(toggleCR(['a', 'b'], 'a', 2)).toEqual(['b']);
  });
});

const slot = (
  rows: SlotDraft['rows'],
  cr: string[],
  values = { food: 'carnivore' },
): SlotDraft => ({
  templateId: 'eats',
  values,
  rows,
  cr,
});

describe('toPuzzleJson and fromPuzzle', () => {
  const draft: EditorDraft = {
    ...emptyDraft('2026-11-25'),
    slots: [
      slot(
        [
          { animalId: 'bear', level: 1, include: true },
          { animalId: 'red-fox', level: 2, include: true },
          { animalId: 'polar-bear', level: 3, include: false },
        ],
        ['red-fox'],
      ),
      ...emptyDraft('x').slots.slice(1),
    ],
  };

  it('writes included rows, the CR pick at level 5, and leaves empty slots out', () => {
    expect(toPuzzleJson(draft)).toEqual({
      date: '2026-11-25',
      number: 20,
      prompts: [
        {
          id: 'eats-carnivore',
          text: 'Name an animal that eats meat',
          answers: [
            { animalId: 'bear', level: 1 },
            { animalId: 'red-fox', level: 5 },
          ],
        },
      ],
    });
  });

  it('reads a puzzle back with its CR picks, as free-text prompts, padded to 7 slots', () => {
    const json = toPuzzleJson(draft);
    const back = fromPuzzle(json);
    expect(back.slots).toHaveLength(SLOT_COUNT);
    expect(back.slots[0]).toMatchObject({
      templateId: 'free',
      values: { text: 'Name an animal that eats meat' },
      cr: ['red-fox'],
    });
    // Round trip: the same answers come out again (the prompt id now comes from its text).
    expect(slotAnswers(back.slots[0]!)).toEqual(json.prompts[0]!.answers);
  });
});

describe('levelCounts and recentUses', () => {
  it('counts answers per level', () => {
    expect(levelCounts([{ level: 1 }, { level: 1 }, { level: 5 }])).toEqual({
      1: 2,
      2: 0,
      3: 0,
      4: 0,
      5: 1,
    });
  });

  it('finds the dates a prompt was used, by id or by text', () => {
    const recent = [
      puzzle('2026-11-20', [{ id: 'eats-carnivore', text: 'Other words', answers: [] }]),
      puzzle('2026-11-21', [{ id: 'x', text: 'Name an animal that eats MEAT ', answers: [] }]),
      puzzle('2026-11-22', [{ id: 'y', text: 'Something else', answers: [] }]),
    ];
    expect(
      recentUses({ id: 'eats-carnivore', text: 'Name an animal that eats meat' }, recent),
    ).toEqual(['2026-11-20', '2026-11-21']);
  });
});

describe('checkPuzzle', () => {
  it('passes a valid draft and reports the real validator error otherwise', () => {
    const good = toPuzzleJson({
      date: '2026-11-25',
      slots: [slot([{ animalId: 'red-fox', level: 2, include: true }], ['red-fox'])],
    });
    expect(checkPuzzle(good, animals)).toEqual({ error: null, warnings: [], collisions: [] });
    const noCR = toPuzzleJson({
      date: '2026-11-25',
      slots: [slot([{ animalId: 'red-fox', level: 2, include: true }], [])],
    });
    expect(checkPuzzle(noCR, animals).error).toMatch(/exactly one level-5 \(CR\) answer \(got 0\)/);
  });

  it('passes on the validator warnings', () => {
    const groupAbove = toPuzzleJson({
      date: '2026-11-25',
      slots: [
        slot(
          [
            { animalId: 'bear', level: 3, include: true },
            { animalId: 'polar-bear', level: 2, include: true },
            { animalId: 'red-fox', level: 1, include: true },
          ],
          ['red-fox'],
        ),
      ],
    });
    expect(checkPuzzle(groupAbove, animals).warnings).toEqual([
      expect.stringContaining(
        '"polar-bear" is level 2 (NT), below its group "bear" at level 3 (VU)',
      ),
    ]);
  });
});

describe('redraftSlot and addAnimal', () => {
  it('keeps your level and include on redrafted rows, keeps hand-added rows, drops the rest', () => {
    const before: SlotDraft = {
      templateId: 'continent',
      values: { continent: 'north-america' },
      rows: [
        { animalId: 'red-fox', level: 4, include: false },
        { animalId: 'polar-bear', level: 3, include: true },
        { animalId: 'penguin', level: 1, include: true, manual: true },
      ],
      cr: ['polar-bear', 'red-fox'],
    };
    const drafted = draftRows({ op: 'equals', trait: 'class', value: 'mammal' }, animals, usage);
    const after = redraftSlot(before, drafted, animals);
    expect(after.rows).toEqual([
      { animalId: 'bear', level: 1, include: false },
      { animalId: 'penguin', level: 1, include: true, manual: true },
      { animalId: 'polar-bear', level: 3, include: true },
      { animalId: 'red-fox', level: 4, include: false },
    ]);
    // red-fox is no longer included, so it can't stay CR.
    expect(after.cr).toEqual(['polar-bear']);
  });

  it('adds an animal by display name or id, once, with a suggested level', () => {
    const empty: SlotDraft = { templateId: 'free', values: { text: 'X' }, rows: [], cr: [] };
    const one = addAnimal(empty, 'red FOX', animals, usage);
    expect(one.rows).toEqual([{ animalId: 'red-fox', level: 2, include: true, manual: true }]);
    expect(addAnimal(one, 'red-fox', animals, usage)).toBe(one);
    expect(addAnimal(one, 'dodo', animals, usage)).toBe(one);
  });
});
