import type { InstallOffer } from '@/core/install';
import { h } from '../dom';
import { reloadForNewVersion } from '../newVersion';

/**
 * Where the install hint goes: an empty slot, filled once its code has loaded
 * (installHint.ts, with import(), so it stays out of the first JavaScript),
 * and only when there is something to offer. Null otherwise, as installHint.
 */
export function lazyInstallHint(offer: InstallOffer | undefined): HTMLElement | null {
  if (!offer?.shouldShow()) return null;
  const slot = h('div', { class: 'install-hint-slot' });
  import('./installHint')
    .then(({ installHint }) => {
      const hint = installHint(offer);
      if (hint) slot.replaceWith(hint);
      else slot.remove();
    })
    .catch((error: unknown) => {
      // A small extra: leave nothing behind, and pick up a new version if that's why.
      slot.remove();
      console.warn('The install hint could not load.', error);
      reloadForNewVersion();
    });
  return slot;
}
