import { NEW_VERSION_RELOAD_GUARD_MS } from '@/config/data';

const KEY = 'tabimate:reloaded-for-new-version';

export interface ReloadDeps {
  readonly storage: Pick<Storage, 'getItem' | 'setItem'> | null;
  readonly reload: () => void;
  readonly now: () => number;
}

const browserDeps = (): ReloadDeps => {
  let storage: Storage | null = null;
  try {
    storage = window.sessionStorage;
  } catch {
    // Storage blocked: reload anyway; the guard just can't remember.
  }
  return { storage, reload: () => window.location.reload(), now: Date.now };
};

/**
 * A screen's code (an import() chunk) failed to load. With the service worker
 * updating itself, the usual cause is a new version deployed mid-session: the
 * old chunks are gone and the server answers with index.html. Reloading picks
 * the new version up, and is safe because the run is saved. Not again within
 * NEW_VERSION_RELOAD_GUARD_MS, so a real failure (offline) can't loop.
 * Returns whether it reloaded.
 */
export function reloadForNewVersion(deps: ReloadDeps = browserDeps()): boolean {
  const last = deps.storage?.getItem(KEY);
  if (last != null && deps.now() - Number(last) < NEW_VERSION_RELOAD_GUARD_MS) return false;
  deps.storage?.setItem(KEY, String(deps.now()));
  deps.reload();
  return true;
}
