// The editor's checks are the real ones: the same validator and name check that
// validate-data runs, so a puzzle that passes here passes there.
import type { AnimalLookup } from '@/core/types';
import { nameCollisions } from '@/data/checkNames';
import { validatePuzzle } from '@/data/validate';
import type { PuzzleJson } from './model';

export interface CheckResult {
  /** The validator's first error (it stops there), or null when the file is valid. */
  readonly error: string | null;
  readonly warnings: readonly string[];
  /** Names that would not lead back to their own answer (data/checkNames.ts). */
  readonly collisions: readonly string[];
}

export function checkPuzzle(json: PuzzleJson, animals: AnimalLookup): CheckResult {
  const warnings: string[] = [];
  try {
    const puzzle = validatePuzzle(json, {
      file: `data/puzzles/${json.date}.json`,
      key: json.date,
      animals,
      warn: (message) => warnings.push(message),
    });
    return { error: null, warnings, collisions: nameCollisions(puzzle, animals) };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      warnings,
      collisions: [],
    };
  }
}
