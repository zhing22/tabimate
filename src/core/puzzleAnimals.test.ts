import { describe, expect, it } from 'vitest';
import { ANIMALS } from './matcher/testFixtures';
import { puzzleAnimals } from './puzzleAnimals';
import type { Puzzle } from './types';

describe('puzzleAnimals', () => {
  it("keeps the puzzle's answers and each group answer's representative, nothing else", () => {
    const puzzle: Puzzle = {
      date: '2026-11-25',
      number: 20,
      prompts: [
        { id: 'a', text: 'A', answers: [{ animalId: 'penguin', level: 1 }] },
        {
          id: 'b',
          text: 'B',
          answers: [
            { animalId: 'tiger', level: 4 },
            { animalId: 'gone', level: 2 }, // not in the registry: skipped
          ],
        },
      ],
    };
    // penguin is a group drawn as emperor-penguin, which isn't an answer itself.
    expect([...puzzleAnimals(puzzle, ANIMALS).keys()].sort()).toEqual([
      'emperor-penguin',
      'penguin',
      'tiger',
    ]);
  });
});
