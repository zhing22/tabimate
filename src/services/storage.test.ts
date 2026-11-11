import { describe, expect, it } from 'vitest';
import { createLocalStorageAdapter, createMemoryStorageAdapter, type WebStorage } from './storage';

/** A Web Storage stand-in that can be told to fail like a real browser. */
function fakeStorage(fail: { get?: boolean; set?: boolean; remove?: boolean } = {}) {
  const items = new Map<string, string>();
  const storage: WebStorage = {
    getItem(key) {
      if (fail.get) throw new Error('SecurityError');
      return items.get(key) ?? null;
    },
    setItem(key, value) {
      if (fail.set) throw new Error('QuotaExceededError');
      items.set(key, value);
    },
    removeItem(key) {
      if (fail.remove) throw new Error('SecurityError');
      items.delete(key);
    },
  };
  return { storage, items, fail };
}

describe('createMemoryStorageAdapter', () => {
  it('stores, reads back and removes', () => {
    const store = createMemoryStorageAdapter();
    expect(store.get('k')).toBeNull();
    store.set('k', { a: [1, 2] });
    expect(store.get('k')).toEqual({ a: [1, 2] });
    store.remove('k');
    expect(store.get('k')).toBeNull();
  });

  it('hands out copies, like real storage', () => {
    const store = createMemoryStorageAdapter();
    const value = { n: 1 };
    store.set('k', value);
    value.n = 2;
    expect(store.get('k')).toEqual({ n: 1 });
  });
});

describe('createLocalStorageAdapter', () => {
  it('reads and writes JSON in web storage', () => {
    const { storage, items } = fakeStorage();
    const store = createLocalStorageAdapter(() => storage);
    store.set('k', { streak: 3 });
    expect(items.get('k')).toBe('{"streak":3}');
    expect(store.get('k')).toEqual({ streak: 3 });
    store.remove('k');
    expect(items.has('k')).toBe(false);
  });

  it('hands back text that is not JSON as it is, so it can be backed up', () => {
    const { storage, items } = fakeStorage();
    items.set('k', '{not json');
    expect(createLocalStorageAdapter(() => storage).get('k')).toBe('{not json');
  });

  it('works from memory when storage cannot even be reached (private mode)', () => {
    const store = createLocalStorageAdapter(() => {
      throw new Error('SecurityError');
    });
    store.set('k', 1);
    expect(store.get('k')).toBe(1);
  });

  it('keeps the latest value when the quota runs out mid-session', () => {
    const { storage, items, fail } = fakeStorage();
    const store = createLocalStorageAdapter(() => storage);
    store.set('k', 'saved');
    fail.set = true;
    expect(() => store.set('k', 'newer')).not.toThrow();
    expect(store.get('k')).toBe('newer');
    expect(items.get('k')).toBe('"saved"');
  });

  it('never throws when reads or removes fail', () => {
    const { storage } = fakeStorage({ get: true, remove: true });
    const store = createLocalStorageAdapter(() => storage);
    expect(() => store.get('k')).not.toThrow();
    expect(() => store.remove('k')).not.toThrow();
    store.set('k', 5);
    expect(store.get('k')).toBe(5);
  });
});
