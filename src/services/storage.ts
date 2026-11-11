import type { StorageAdapter } from '@/core/storage';

/** The part of the Web Storage API we use; injectable so tests can make it fail. */
export type WebStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Keeps values in a map, as JSON, so callers get copies just like real storage. */
export function createMemoryStorageAdapter(): StorageAdapter {
  const values = new Map<string, string>();
  return {
    get(key) {
      const text = values.get(key);
      return text === undefined ? null : (JSON.parse(text) as unknown);
    },
    set(key, value) {
      values.set(key, JSON.stringify(value));
    },
    remove(key) {
      values.delete(key);
    },
  };
}

/**
 * localStorage as JSON. Every value is also kept in memory, and the first
 * time localStorage throws (private mode, quota full, blocked by the browser)
 * the adapter carries on from memory for the rest of the session, so the
 * game keeps working and only persistence is lost.
 */
export function createLocalStorageAdapter(
  getStorage: () => WebStorage = () => localStorage,
): StorageAdapter {
  const memory = createMemoryStorageAdapter();
  let storage: WebStorage | null;
  try {
    storage = getStorage(); // reading window.localStorage itself can throw
  } catch {
    storage = null;
  }

  // Runs a storage call; on failure, switches to memory for good.
  function attempt<T>(call: (s: WebStorage) => T): { ok: true; value: T } | { ok: false } {
    if (!storage) return { ok: false };
    try {
      return { ok: true, value: call(storage) };
    } catch {
      storage = null;
      return { ok: false };
    }
  }

  return {
    get(key) {
      const read = attempt((s) => s.getItem(key));
      if (!read.ok) return memory.get(key);
      if (read.value === null) return null;
      try {
        return JSON.parse(read.value) as unknown;
      } catch {
        // Not JSON (corrupt or hand-edited): hand back the text itself, so the
        // caller can reject it but still back it up instead of losing it.
        return read.value;
      }
    },
    set(key, value) {
      memory.set(key, value);
      attempt((s) => s.setItem(key, JSON.stringify(value)));
    },
    remove(key) {
      memory.remove(key);
      attempt((s) => s.removeItem(key));
    },
  };
}
