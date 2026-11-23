import { describe, expect, it } from 'vitest';
import { STATS } from '@/config/stats';
import { PROMPT } from './matcher/testFixtures';
import { pickedShare, submissionFor, type DayStats } from './stats';
import type { Puzzle, RoundResult } from './types';

const result = (animalId: string | null): RoundResult => ({
  promptId: 'x',
  timeMs: 1,
  match:
    animalId === null
      ? { level: 0, animalId: null, strategy: null, input: '' }
      : { level: 2, animalId, strategy: 'exact', input: animalId },
});

describe('submissionFor', () => {
  it("pairs each prompt with the run's answer, a miss as null, by order", () => {
    const puzzle: Puzzle = {
      date: '2026-11-23',
      number: 1,
      prompts: ['a', 'b', 'c'].map((id) => ({ ...PROMPT, id })),
    };
    expect(submissionFor('dev', puzzle, [result('tiger'), result(null)])).toEqual({
      deviceId: 'dev',
      dateKey: '2026-11-23',
      answers: [
        { promptId: 'a', answerId: 'tiger' },
        { promptId: 'b', answerId: null },
      ],
    });
  });
});

describe('pickedShare', () => {
  const stats = (players: number): DayStats => ({
    dateKey: '2026-11-23',
    prompts: { a: { players, answers: { tiger: players / 4 } } },
  });

  it('gives the percentage once enough players have played', () => {
    expect(pickedShare(stats(STATS.minPlayers), 'a', 'tiger')).toBe(25);
    expect(pickedShare(stats(40), 'a', 'lion')).toBe(0);
  });

  it('gives nothing with too few players, no stats, or an unknown prompt', () => {
    expect(pickedShare(stats(STATS.minPlayers - 1), 'a', 'tiger')).toBeNull();
    expect(pickedShare(null, 'a', 'tiger')).toBeNull();
    expect(pickedShare(stats(40), 'b', 'tiger')).toBeNull();
  });
});
