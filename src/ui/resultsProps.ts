import { themeFor } from '@/config/themes';
import { shiftKey } from '@/core/date';
import { biomeFor } from '@/core/journey';
import type { Stats } from '@/core/streak';
import { bonusLine, pointsFor } from '@/core/scoring';
import type { Animal, AnimalId, BonusResult, Prompt, Puzzle, RoundResult } from '@/core/types';
import type { AnswerLine } from './components/answerRow';
import type { ResultsProps } from './screens/results';

/** A finished run as runFinished reports it, with the stats after recording it. */
export interface FinishedRun {
  readonly results: readonly RoundResult[];
  /** The bonus quiz's answers; empty on a day without one. */
  readonly bonusResults: readonly BonusResult[];
  /** The answers' points alone: how far the walk went (biome, scenery). */
  readonly base: number;
  readonly multiplier: number;
  /** The day total: base times the multiplier. */
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
  { results, bonusResults, base, multiplier, score, stats }: FinishedRun,
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
    base,
    bonusLine: bonusResults.length > 0 ? bonusLine(base, multiplier, score) : null,
    biomeName: biomeFor(base).name,
    streak: stats.streak,
    bestStreak: stats.bestStreak,
    msUntilNext,
    // Only the theme's name: tomorrow's prompts stay unknown until tomorrow.
    tomorrowTheme: themeFor(shiftKey(puzzle.date, 1))?.name ?? null,
  };
}
