// The history screen's calendar colours each finished day by its score.

export interface ScoreBand {
  /** Lowest day total in this band. The first band must start at 0. */
  readonly min: number;
  readonly label: string;
  /** CSS custom property in tokens.css (with a matching -ink for text on it). */
  readonly colour: `--band-${number}`;
}

/**
 * Bands of a day's total, lowest first. A 7-prompt day tops out at 700; the
 * steps roughly follow the biome thresholds (config/biomes.ts) so a colour
 * says about how far the walk went.
 */
export const SCORE_BANDS = [
  { min: 0, label: 'A short stroll', colour: '--band-1' },
  { min: 100, label: 'A good walk', colour: '--band-2' },
  { min: 250, label: 'A long hike', colour: '--band-3' },
  { min: 400, label: 'An expedition', colour: '--band-4' },
  { min: 550, label: 'An epic journey', colour: '--band-5' },
] as const satisfies readonly [ScoreBand, ...ScoreBand[]];
