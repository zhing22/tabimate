import { describe, expect, it } from 'vitest';
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
});
