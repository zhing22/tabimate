import { describe, expect, it } from 'vitest';
import { matchAnswer } from '@/core/matcher';
import { namesSeveralAnimals } from '@/core/matcher/lists';
import { normalize } from '@/core/matcher/normalize';
import type { Puzzle } from '@/core/types';
import { validateAnimals, validatePuzzle } from './validate';

// The real files in public/data, so a bad edit to the shipped data fails `npm run check`.
const animalsJson = import.meta.glob<unknown>('../../public/data/animals.json', {
  eager: true,
  import: 'default',
});
const puzzleJson = import.meta.glob<unknown>('../../public/data/puzzles/*.json', {
  eager: true,
  import: 'default',
});

const keyOf = (path: string) => /(\d{4}-\d{2}-\d{2})\.json$/.exec(path)?.[1] ?? path;

describe('public/data', () => {
  const [animals] = Object.values(animalsJson);
  const registry = validateAnimals(animals, 'data/animals.json');

  it('has a valid animal registry', () => {
    expect(registry.size).toBeGreaterThanOrEqual(30);
  });

  it('has puzzle files', () => {
    expect(Object.keys(puzzleJson).length).toBeGreaterThan(0);
  });

  it.each(Object.entries(puzzleJson))('%s is valid', (path, json) => {
    const key = keyOf(path);
    const puzzle = validatePuzzle(json, {
      file: `data/puzzles/${key}.json`,
      key,
      animals: registry,
    });
    expect(puzzle.date).toBe(key);
  });

  const puzzles: Puzzle[] = Object.entries(puzzleJson).map(([path, json]) =>
    validatePuzzle(json, { file: path, key: keyOf(path), animals: registry }),
  );

  // A close guess is corrected to the display name, so that name must score.
  it('scores every answer when its exact display name is typed', () => {
    for (const puzzle of puzzles) {
      for (const prompt of puzzle.prompts) {
        for (const { animalId, tier } of prompt.answers) {
          const display = registry.get(animalId)!.display;
          expect(matchAnswer(display, prompt, registry), `${puzzle.date} ${prompt.id}`).toEqual({
            tier,
            animalId,
            strategy: 'exact',
            input: display,
          });
        }
      }
    }
  });

  it('never reads one animal\x27s own name as a list of animals', () => {
    for (const animal of registry.values()) {
      for (const name of [animal.display, ...animal.aliases]) {
        expect(namesSeveralAnimals(normalize(name), registry), name).toBe(false);
      }
    }
  });
});
