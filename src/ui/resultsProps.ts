import { biomeFor } from '@/core/journey';
import type { Stats } from '@/core/streak';
import { pointsFor } from '@/core/scoring';
import type { Animal, AnimalId, Prompt, Puzzle, RoundResult } from '@/core/types';
import type { AnswerLine } from './components/answerRow';
import type { ResultsProps } from './screens/results';

export interface FinishedRun {
  readonly results: readonly RoundResult[];
  readonly score: number;
  /** Stats with this run already recorded. */
  readonly stats: Stats;
}

export type AnimalOf = (result: RoundResult) => Animal | null;

/** What the results screen shows for a finished run (everything but the delay). */
/**
 * Every answer a prompt accepted, rarest (most points) first, then by name;
 * the player's own marked, with what the list shows when a row opens
 * (description, Wikipedia link). Names only: the list shows no pictures.
 */
export function answerLines(
  prompt: Prompt,
  animals: ReadonlyMap<AnimalId, Animal>,
  picked: AnimalId | null,
): AnswerLine[] {
  return prompt.answers
    .map(({ animalId, level }): AnswerLine => {
      const animal = animals.get(animalId);
      return {
        animalId,
        name: animal?.display ?? animalId.replace(/-/g, ' '),
        level,
        points: pointsFor(level),
        picked: animalId === picked,
        description: animal?.description,
        wiki: animal?.wiki,
      };
    })
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}

export function resultsProps(
  puzzle: Puzzle,
  animalOf: AnimalOf,
  animals: ReadonlyMap<AnimalId, Animal>,
  { results, score, stats }: FinishedRun,
  msUntilNext: () => number,
): ResultsProps {
  return {
    rounds: results.flatMap((result, i) => {
      const prompt = puzzle.prompts[i];
      if (!prompt) return [];
      const answers = answerLines(prompt, animals, result.match.animalId);
      return [{ prompt, result, animal: animalOf(result), answers }];
    }),
    score,
    biomeName: biomeFor(score).name,
    streak: stats.streak,
    bestStreak: stats.bestStreak,
    msUntilNext,
  };
}
