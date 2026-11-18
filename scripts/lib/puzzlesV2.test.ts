import { describe, expect, it } from 'vitest';
import { animalsToV2, appearances, crProblems, fixCr, puzzleToV2 } from './puzzlesV2';

const v1 = () => ({
  date: '2026-11-07',
  number: 2,
  prompts: [
    {
      id: 'a',
      text: 'A',
      answers: [
        { animalId: 'fox', tier: 5 },
        { animalId: 'owl', tier: 5 },
        { animalId: 'cat', tier: 1 },
      ],
    },
    { id: 'b', text: 'B', answers: [{ animalId: 'owl', tier: 5 }] },
    {
      id: 'c',
      text: 'C',
      answers: [
        { animalId: 'fox', tier: 3 },
        { animalId: 'owl', tier: 3 },
        { animalId: 'cat', tier: 1 },
      ],
    },
  ],
});

describe('puzzleToV2', () => {
  it('renames tier to level and keeps everything else', () => {
    const v2 = puzzleToV2(v1());
    expect(v2.number).toBe(2);
    expect(v2.prompts[1]).toEqual({ id: 'b', text: 'B', answers: [{ animalId: 'owl', level: 5 }] });
  });

  it('is safe to run twice', () => {
    const once = puzzleToV2(v1());
    expect(puzzleToV2(once as never)).toEqual(once);
  });
});

describe('animalsToV2', () => {
  it('marks animals without a kind as species, leaving set kinds alone', () => {
    expect(animalsToV2([{ id: 'fox' }, { id: 'canid', kind: 'group' }])).toEqual([
      { id: 'fox', kind: 'species' },
      { id: 'canid', kind: 'group' },
    ]);
  });
});

describe('crProblems', () => {
  it('lists prompts with no CR or with several', () => {
    expect(crProblems([puzzleToV2(v1())])).toEqual([
      { date: '2026-11-07', promptId: 'a', text: 'A', top: ['fox', 'owl'] },
      { date: '2026-11-07', promptId: 'c', text: 'C', top: [] },
    ]);
  });
});

describe('fixCr', () => {
  it('keeps the least-used animal at 5, demotes the rest, promotes where there is none', () => {
    const puzzle = puzzleToV2(v1());
    const counts = appearances([puzzle]);
    expect(counts.get('owl')).toBe(3);
    expect(fixCr(puzzle, counts)).toEqual([
      { date: '2026-11-07', promptId: 'a', kept: 'fox', demoted: ['owl'], promoted: null },
      { date: '2026-11-07', promptId: 'c', kept: 'fox', demoted: [], promoted: 'fox' },
    ]);
    expect(crProblems([puzzle])).toEqual([]);
    expect(puzzle.prompts[0]!.answers.map((a) => a.level)).toEqual([5, 4, 1]);
    expect(puzzle.prompts[2]!.answers.map((a) => a.level)).toEqual([5, 3, 1]);
  });
});
