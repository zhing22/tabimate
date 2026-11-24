// What the Field Journal screen shows, from the animals and the saved
// collection: one tab for every animal, one per set, and the achievements.
import type { Collection } from '@/core/collection';
import type { JournalEntry } from '@/core/journal/journal';
import { JOURNAL_SETS, setMembers, setProgress } from '@/core/journal/sets';
import type { Animal, AnimalLookup } from '@/core/types';

export interface JournalCell {
  readonly animal: Animal;
  /** Null until it has been found: the grid shows a silhouette. */
  readonly entry: JournalEntry | null;
}

export interface JournalTab {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly cells: readonly JournalCell[];
  /** Sets only: how much is found, and the stamp once all of it is. */
  readonly progress?: {
    readonly found: number;
    readonly total: number;
    readonly complete: boolean;
  };
}

const cellsOf = (animals: readonly Animal[], collection: Collection): JournalCell[] =>
  animals.map((animal) => ({ animal, entry: collection.journal[animal.id] ?? null }));

/** "All animals" first, then each set (config order) with its progress. */
export function journalTabs(animals: AnimalLookup, collection: Collection): JournalTab[] {
  const all: JournalTab = {
    id: 'all',
    label: 'All animals',
    icon: '📖',
    cells: cellsOf([...animals.values()], collection),
  };
  const sets = JOURNAL_SETS.map((set): JournalTab => ({
    id: set.id,
    label: set.name,
    icon: set.icon,
    cells: cellsOf(setMembers(set, animals), collection),
    progress: setProgress(collection.journal, set, animals),
  }));
  return [all, ...sets];
}
