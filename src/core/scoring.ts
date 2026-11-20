import { BONUS } from '@/config/bonus';
import { LEVELS, type LevelId } from '@/config/levels';
import type { BonusResult, RoundResult, RunState } from './types';

/** Points for an answer level: fixed per level in config (0 for a miss). */
export const pointsFor = (level: LevelId): number => LEVELS[level].points;

/** Every round's points added up: the walk's distance, before any bonus. */
export const baseTotal = (results: readonly RoundResult[]): number =>
  results.reduce((sum, r) => sum + pointsFor(r.match.level), 0);

/**
 * The day multiplier from the bonus quiz: 1 + BONUS.step per right answer, at
 * most BONUS.maxMultiplier. Exactly 1 without a quiz. Rounded to one decimal,
 * so it reads and multiplies as written (1.2, never 1.2000000000000002).
 */
export const bonusMultiplier = (bonus: readonly BonusResult[] = []): number => {
  const correct = bonus.filter((b) => b.correct).length;
  return Math.round(Math.min(BONUS.maxMultiplier, 1 + BONUS.step * correct) * 10) / 10;
};

/**
 * A day's total: every round's points, times the bonus multiplier. The
 * multiplier applies to the total only, never to single answers (at most 100
 * each). Rounded to whole points.
 */
export const dayTotal = (
  results: readonly RoundResult[],
  bonus: readonly BonusResult[] = [],
): number => Math.round(baseTotal(results) * bonusMultiplier(bonus));

/** A finished run's totals, as runFinished reports them. */
export const runTotals = (run: Pick<RunState, 'results' | 'bonusResults'>) => ({
  results: run.results,
  bonusResults: run.bonusResults,
  base: baseTotal(run.results),
  multiplier: bonusMultiplier(run.bonusResults),
  score: dayTotal(run.results, run.bonusResults),
});

/** "Base 540 ×1.2 = 648": how a quiz day's total was reached (results, share, history). */
export const bonusLine = (base: number, multiplier: number, score: number): string =>
  `Base ${base} ×${multiplier.toFixed(1)} = ${score}`;
