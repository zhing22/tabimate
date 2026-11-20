import { describe, expect, it } from 'vitest';
import type { AnswerLevel } from '@/config/levels';
import { ANIMALS } from '../matcher/testFixtures';
import type { Animal, RoundResult } from '../types';
import { addRun, emptyJournal, fillJournal, isInJournal, journalSize } from './journal';
import { JOURNAL_SETS, setMembers, setProgress } from './sets';

const hit = (animalId: string, level: AnswerLevel): RoundResult => ({
  promptId: 'p',
  timeMs: 1,
  match: { level, animalId, strategy: 'exact', input: animalId },
});
const miss: RoundResult = {
  promptId: 'p',
  timeMs: 1,
  match: { level: 0, animalId: null, strategy: null, input: '' },
};
const run = (puzzleDate: string, ...results: RoundResult[]) => ({ puzzleDate, results });

describe('addRun', () => {
  it('adds each new animal once, in the order found, and skips misses', () => {
    const { journal, newlyFound } = addRun(
      emptyJournal(),
      run('2026-11-19', hit('tiger', 4), miss, hit('platypus', 2), hit('tiger', 3)),
    );
    expect(newlyFound).toEqual(['tiger', 'platypus']);
    expect(journalSize(journal)).toBe(2);
    expect(journal.tiger).toEqual({
      animalId: 'tiger',
      firstFoundKey: '2026-11-19',
      timesFound: 2,
      bestLevel: 4,
    });
  });

  it('keeps the first date and the best level across runs, counting every find', () => {
    const first = addRun(emptyJournal(), run('2026-11-19', hit('tiger', 3))).journal;
    const { journal, newlyFound } = addRun(first, run('2026-11-20', hit('tiger', 4)));
    expect(newlyFound).toEqual([]);
    expect(journal.tiger).toMatchObject({
      firstFoundKey: '2026-11-19',
      timesFound: 2,
      bestLevel: 4,
    });
    // An older run added later (an archive day) moves the first date back.
    const older = addRun(journal, run('2026-11-01', hit('tiger', 1))).journal;
    expect(older.tiger).toMatchObject({ firstFoundKey: '2026-11-01', bestLevel: 4 });
  });

  it('never changes the journal it was given', () => {
    const before = emptyJournal();
    addRun(before, run('2026-11-19', hit('tiger', 4)));
    expect(isInJournal(before, 'tiger')).toBe(false);
  });
});

describe('journal sets', () => {
  const penguins = JOURNAL_SETS.find((s) => s.id === 'penguins')!;

  it('has unique ids', () => {
    const ids = JOURNAL_SETS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('collects the species under a group, never the group itself', () => {
    expect(setMembers(penguins, ANIMALS).map((a) => a.id)).toEqual([
      'emperor-penguin',
      'african-penguin',
    ]);
  });

  it('counts progress, and stamps a set only once every species is found', () => {
    const some = addRun(emptyJournal(), run('k', hit('penguin', 1), hit('emperor-penguin', 2)));
    expect(setProgress(some.journal, penguins, ANIMALS)).toEqual({
      found: 1,
      total: 2,
      complete: false,
    });
    const all = addRun(some.journal, run('k', hit('african-penguin', 4))).journal;
    expect(setProgress(all, penguins, ANIMALS).complete).toBe(true);
  });

  it('matches trait sets with core/traits filters, unknown never counting', () => {
    const flightless = JOURNAL_SETS.find((s) => s.id === 'flightless')!;
    const bird = (flies?: boolean): Animal => ({
      ...ANIMALS.get('platypus')!,
      traits: { class: 'bird', ...(flies === undefined ? {} : { flies }) },
    });
    expect(flightless.filter(bird(false), ANIMALS)).toBe(true);
    expect(flightless.filter(bird(true), ANIMALS)).toBe(false);
    expect(flightless.filter(bird(), ANIMALS)).toBe(false);
  });

  it('never completes an empty set', () => {
    const empty = { ...penguins, filter: () => false };
    expect(setProgress(emptyJournal(), empty, ANIMALS)).toEqual({
      found: 0,
      total: 0,
      complete: false,
    });
  });
});

describe('fillJournal', () => {
  it('adds every missing animal once, keeping animals already found as they were', () => {
    const before = addRun(emptyJournal(), run('2026-11-19', hit('tiger', 4))).journal;
    const after = fillJournal(before, ['tiger', 'platypus'], '2026-11-20');
    expect(after.tiger).toEqual(before.tiger);
    expect(after.platypus).toEqual({
      animalId: 'platypus',
      firstFoundKey: '2026-11-20',
      timesFound: 1,
      bestLevel: 1,
    });
    expect(isInJournal(before, 'platypus')).toBe(false);
  });
});
