// Player stats: what a finished run sends, what a day's stats look like, and
// the source that carries them (data/statsSource.ts: the API, or nothing when
// offline or in development). The game never waits on it: stats are a bonus.
import { STATS } from '@/config/stats';
import type { AnimalId, DateKey, Puzzle, RoundResult } from './types';

/** One finished run: the answer to each prompt, null for a miss. No personal data. */
export interface RunSubmission {
  /** A random id kept on this device (see services/deviceId.ts), so a run counts once. */
  readonly deviceId: string;
  readonly dateKey: DateKey;
  readonly answers: readonly RunAnswer[];
}

export interface RunAnswer {
  readonly promptId: string;
  readonly answerId: AnimalId | null;
}

export interface PromptStats {
  /** Players who finished this prompt (misses included). */
  readonly players: number;
  /** How many picked each answer. */
  readonly answers: Readonly<Record<AnimalId, number>>;
}

export interface DayStats {
  readonly dateKey: DateKey;
  readonly prompts: Readonly<Record<string, PromptStats>>;
}

export interface StatsSource {
  /** Sends a finished run. Never throws: a failure is kept and retried later. */
  submitRun(run: RunSubmission): Promise<void>;
  /** The day's stats, or null when there are none to show (offline, an error). */
  getDayStats(dateKey: DateKey): Promise<DayStats | null>;
}

/** A finished run's answers, prompt by prompt, as the API takes them. */
export function submissionFor(
  deviceId: string,
  puzzle: Puzzle,
  results: readonly RoundResult[],
): RunSubmission {
  return {
    deviceId,
    dateKey: puzzle.date,
    answers: puzzle.prompts.flatMap((prompt, i) => {
      const result = results[i];
      return result ? [{ promptId: prompt.id, answerId: result.match.animalId }] : [];
    }),
  };
}

/**
 * The percentage of a prompt's players who picked an answer (unrounded: the
 * UI rounds it); null until STATS.minPlayers have played it (a handful of
 * players would make the numbers noise).
 */
export function pickedShare(
  stats: DayStats | null,
  promptId: string,
  animalId: AnimalId,
  minPlayers: number = STATS.minPlayers,
): number | null {
  const prompt = stats?.prompts[promptId];
  if (!prompt || prompt.players < minPlayers) return null;
  return (100 * (prompt.answers[animalId] ?? 0)) / prompt.players;
}
