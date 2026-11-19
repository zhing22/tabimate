import { LEVELS, type LevelId } from '@/config/levels';
import type { RoundResult } from './types';

/** Points for an answer level: fixed per level in config (0 for a miss). */
export const pointsFor = (level: LevelId): number => LEVELS[level].points;

/**
 * A day's total: every round's points added up, then the day's multiplier (a
 * bonus quiz) applied to the total only, never to single answers, which stay
 * at most 100. Rounded to whole points.
 */
export const dayTotal = (results: readonly RoundResult[], multiplier = 1): number =>
  Math.round(results.reduce((sum, r) => sum + pointsFor(r.match.level), 0) * multiplier);
