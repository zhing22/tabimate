// Shape checks for the saved journal and achievements, salvaging entry by
// entry: a bad one is dropped, the rest kept, and `lossy` reports the drop.
import { isLevelId } from '@/config/levels';
import type { UnlockedAchievement } from '@/core/achievements/registry';
import type { Collection } from '@/core/collection';
import { isDateKey } from '@/core/date';
import type { Journal, JournalEntry } from '@/core/journal/journal';
import { addRun } from '@/core/journal/journal';
import type { RunState } from '@/core/types';
import { isObject } from './saveGuards';

const isKey = (value: unknown): value is string => typeof value === 'string' && isDateKey(value);

const isEntry = (id: string, value: unknown): value is JournalEntry =>
  isObject(value) &&
  value.animalId === id &&
  isKey(value.firstFoundKey) &&
  Number.isInteger(value.timesFound) &&
  Number(value.timesFound) >= 1 &&
  isLevelId(value.bestLevel) &&
  value.bestLevel !== 0;

const isUnlocked = (value: unknown): value is UnlockedAchievement =>
  isObject(value) && typeof value.id === 'string' && isKey(value.unlockedKey);

function readJournal(value: unknown): { journal: Journal; lossy: boolean } {
  if (value === undefined) return { journal: {}, lossy: false };
  if (!isObject(value)) return { journal: {}, lossy: true };
  const entries = Object.entries(value);
  const kept = entries.filter((e): e is [string, JournalEntry] => isEntry(e[0], e[1]));
  return { journal: Object.fromEntries(kept), lossy: kept.length < entries.length };
}

function readAchievements(value: unknown): { achievements: UnlockedAchievement[]; lossy: boolean } {
  if (value === undefined) return { achievements: [], lossy: false };
  if (!Array.isArray(value)) return { achievements: [], lossy: true };
  const byId = new Map<string, UnlockedAchievement>();
  for (const item of value) if (isUnlocked(item) && !byId.has(item.id)) byId.set(item.id, item);
  return { achievements: [...byId.values()], lossy: byId.size < value.length };
}

/** The saved journal and achievements, salvaged. */
export function readCollection(
  journal: unknown,
  achievements: unknown,
): { collection: Collection; lossy: boolean } {
  const j = readJournal(journal);
  const a = readAchievements(achievements);
  return {
    collection: { journal: j.journal, achievements: a.achievements },
    lossy: j.lossy || a.lossy,
  };
}

/** A journal from the finished runs a save still holds, oldest first (the v3 back-fill). */
export const journalFromRuns = (runs: readonly RunState[]): Journal =>
  runs
    .filter((run) => run.status === 'finished')
    .sort((a, b) => (a.puzzleDate < b.puzzleDate ? -1 : 1))
    .reduce((journal, run) => addRun(journal, run).journal, {} as Journal);
