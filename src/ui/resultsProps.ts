import { biomeFor } from '@/core/journey';
import type { Stats } from '@/core/streak';
import type { Animal, Puzzle, RoundResult } from '@/core/types';
import type { ResultsProps } from './screens/results';

export interface FinishedRun {
  readonly results: readonly RoundResult[];
  readonly score: number;
  /** Stats with this run already recorded. */
  readonly stats: Stats;
}

export type AnimalOf = (result: RoundResult) => Animal | null;

/** What the results screen shows for a finished run (everything but the interval). */
export function resultsProps(
  puzzle: Puzzle,
  animalOf: AnimalOf,
  { results, score, stats }: FinishedRun,
  msUntilNext: () => number,
): ResultsProps {
  return {
    rounds: results.flatMap((result, i) => {
      const prompt = puzzle.prompts[i];
      return prompt ? [{ prompt, result, animal: animalOf(result) }] : [];
    }),
    score,
    biomeName: biomeFor(score).name,
    streak: stats.streak,
    bestStreak: stats.bestStreak,
    msUntilNext,
  };
}
