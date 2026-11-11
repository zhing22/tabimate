import { RUNS_KEPT_DAYS } from '@/config/game';
import type { Clock } from '@/core/clock';
import { dailyKey, shiftKey } from '@/core/date';
import { canOverwrite } from '@/core/game';
import type { StorageAdapter } from '@/core/storage';
import { currentStreak, historyEntry, recordRun, type Stats } from '@/core/streak';
import type { DateKey, RunState } from '@/core/types';
import {
  BACKUP_KEY,
  isFromNewerVersion,
  parseSaveData,
  readSaveData,
  SAVE_KEY,
  type SaveData,
} from './saveData';

export interface ProgressService {
  /** The saved run for that puzzle, if any. Check it with canRestore before use. */
  loadToday(key: DateKey): RunState | null;
  /** Saves a run in progress. False if it would roll back what is saved. */
  saveRun(state: RunState): boolean;
  /** Saves a finished run and records it in streak and history (once per day). */
  completeRun(state: RunState): boolean;
  /** Stats as of now: the streak reads 0 once a day has been missed. */
  getStats(): Stats;
}

/** Drops full run state older than RUNS_KEPT_DAYS before `latest`. */
function pruneRuns(runs: Record<DateKey, RunState>, latest: DateKey) {
  const oldest = shiftKey(latest, -(RUNS_KEPT_DAYS - 1));
  return Object.fromEntries(Object.entries(runs).filter(([key]) => key >= oldest));
}

function withRun(data: SaveData, state: RunState): SaveData | null {
  const saved = data.runs[state.puzzleDate];
  if (saved && !canOverwrite(saved, state)) return null;
  return {
    ...data,
    runs: pruneRuns({ ...data.runs, [state.puzzleDate]: state }, state.puzzleDate),
  };
}

/**
 * Progress on top of a StorageAdapter. Every call re-reads storage, so two
 * open tabs see each other's saves instead of overwriting them blindly.
 */
export function createProgressService(storage: StorageAdapter, clock: Clock): ProgressService {
  const read = (): SaveData => parseSaveData(storage.get(SAVE_KEY));

  function write(data: SaveData) {
    const raw = storage.get(SAVE_KEY);
    // A newer build's save would be lost by writing our older shape over it.
    if (isFromNewerVersion(raw)) return;
    // Anything we could not read is kept, untouched, before it is replaced.
    if (readSaveData(raw).lossy) storage.set(BACKUP_KEY, raw);
    storage.set(SAVE_KEY, data);
  }

  return {
    loadToday: (key) => read().runs[key] ?? null,

    saveRun(state) {
      const next = withRun(read(), state);
      if (next) write(next);
      return next !== null;
    },

    completeRun(state) {
      if (state.status !== 'finished') return false;
      const data = read();
      const next = withRun(data, state) ?? data; // already saved as finished: just the stats
      const stats = recordRun(next.stats, historyEntry(state));
      if (next === data && stats === data.stats) return false;
      write({ ...next, stats });
      return true;
    },

    getStats() {
      const stats = read().stats;
      return { ...stats, streak: currentStreak(stats, dailyKey(clock.now())) };
    },
  };
}
