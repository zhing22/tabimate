import { BIOMES, type BiomeDef } from '@/config/biomes';
import { DISTANCE_PER_POINT } from '@/config/game';
import { TIERS } from '@/config/tiers';
import type { RoundResult } from './types';

/** Points one round scored, from its tier. */
export const pointsFor = (result: RoundResult): number => TIERS[result.match.tier].points;

export const totalScore = (results: readonly RoundResult[]): number =>
  results.reduce((sum, result) => sum + pointsFor(result), 0);

/** How far along the journey a score puts the player. */
export const distanceFor = (score: number): number => score * DISTANCE_PER_POINT;

/** The biome a score has reached: the last one whose threshold it meets. */
export function biomeFor(score: number): BiomeDef {
  let current: BiomeDef = BIOMES[0];
  for (const biome of BIOMES) if (score >= biome.minScore) current = biome;
  return current;
}

/**
 * Biomes newly reached going from one score to a higher one, in journey order.
 * One answer can cross more than one threshold.
 */
export const biomesEntered = (from: number, to: number): readonly BiomeDef[] =>
  BIOMES.filter((biome) => biome.minScore > from && biome.minScore <= to);
