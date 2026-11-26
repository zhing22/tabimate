import { describe, expect, it, vi } from 'vitest';
import { NEW_VERSION_RELOAD_GUARD_MS } from '@/config/data';
import { reloadForNewVersion } from './newVersion';

function deps(start = 1_000_000) {
  const stored = new Map<string, string>();
  let now = start;
  return {
    storage: {
      getItem: (k: string) => stored.get(k) ?? null,
      setItem: (k: string, v: string) => void stored.set(k, v),
    },
    reload: vi.fn(),
    now: () => now,
    advance: (ms: number) => (now += ms),
  };
}

describe('reloadForNewVersion', () => {
  it('reloads once, then not again until the guard has passed', () => {
    const d = deps();
    expect(reloadForNewVersion(d)).toBe(true);
    expect(reloadForNewVersion(d)).toBe(false);
    d.advance(NEW_VERSION_RELOAD_GUARD_MS);
    expect(reloadForNewVersion(d)).toBe(true);
    expect(d.reload).toHaveBeenCalledTimes(2);
  });

  it('still reloads with no storage', () => {
    const reload = vi.fn();
    expect(reloadForNewVersion({ storage: null, reload, now: () => 5 })).toBe(true);
    expect(reload).toHaveBeenCalledOnce();
  });
});
