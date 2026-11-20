// The Field Journal: every animal the player has ever found, kept forever.
// Pure: a journal goes in, a new one comes out.
import type { AnswerLevel } from '@/config/levels';
import type { AnimalId, DateKey, RoundResult } from '../types';

export interface JournalEntry {
  readonly animalId: AnimalId;
  /** The puzzle on which it was first found. */
  readonly firstFoundKey: DateKey;
  /** Every find counts, on any day (twice in one run counts twice). */
  readonly timesFound: number;
  /** The rarest level it was ever found at. */
  readonly bestLevel: AnswerLevel;
}

/** Entries by animal id, so a lookup and a JSON save are both simple. */
export type Journal = Readonly<Record<AnimalId, JournalEntry>>;

/** A finished run, as far as the journal cares. */
export interface JournalRun {
  readonly puzzleDate: DateKey;
  readonly results: readonly RoundResult[];
}

export const emptyJournal = (): Journal => ({});

/**
 * Every answer ever found, groups included: "penguin" is a real answer and
 * fills its own cell. The journal total and the journal-N goals count this way;
 * sets (sets.ts) count species only, on purpose (a family name is not a bear).
 */
export const journalSize = (journal: Journal): number => Object.keys(journal).length;

export const isInJournal = (journal: Journal, id: AnimalId): boolean =>
  Object.prototype.hasOwnProperty.call(journal, id);

function found(entry: JournalEntry | undefined, id: AnimalId, key: DateKey, level: AnswerLevel) {
  if (!entry) return { animalId: id, firstFoundKey: key, timesFound: 1, bestLevel: level };
  return {
    animalId: id,
    firstFoundKey: key < entry.firstFoundKey ? key : entry.firstFoundKey,
    timesFound: entry.timesFound + 1,
    bestLevel: Math.max(entry.bestLevel, level) as AnswerLevel,
  };
}

/**
 * Adds a run's finds to the journal. Returns the new journal and the animals
 * it had never had before, in the order the run found them. The caller adds a
 * run once (services/progress.ts does it as the day is first recorded).
 */
export function addRun(
  journal: Journal,
  run: JournalRun,
): { journal: Journal; newlyFound: readonly AnimalId[] } {
  const next: Record<AnimalId, JournalEntry> = { ...journal };
  const newlyFound: AnimalId[] = [];
  for (const { match } of run.results) {
    if (match.level === 0) continue;
    const id = match.animalId;
    if (!isInJournal(next, id)) newlyFound.push(id);
    next[id] = found(next[id], id, run.puzzleDate, match.level);
  }
  return { journal: next, newlyFound };
}
