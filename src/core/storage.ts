/**
 * Key-value store for saved progress. Values must be JSON-safe. Implementations
 * never throw: private mode or a full quota must not crash the game. get()
 * returns unknown because stored data can be old, corrupt or edited by hand;
 * callers validate it. The real one is services/storage.ts.
 */
export interface StorageAdapter {
  /**
   * The stored value; null if there is none or storage cannot be reached. A
   * value that cannot be decoded comes back raw (e.g. as its text), so the
   * caller can reject it without losing it.
   */
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  remove(key: string): void;
}
