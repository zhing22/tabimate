import type { InstallOffer } from '@/core/install';
import { h } from '../dom';

/**
 * Where the install hint goes: an empty slot, filled once its code has loaded
 * (installHint.ts, with import(), so it stays out of the first JavaScript),
 * and only when there is something to offer. Null otherwise, as installHint.
 */
export function lazyInstallHint(offer: InstallOffer | undefined): HTMLElement | null {
  if (!offer?.shouldShow()) return null;
  const slot = h('div', { class: 'install-hint-slot' });
  void import('./installHint').then(({ installHint }) => {
    const hint = installHint(offer);
    if (hint) slot.replaceWith(hint);
    else slot.remove();
  });
  return slot;
}
