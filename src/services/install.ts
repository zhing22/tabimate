import { INSTALL_HINT } from '@/config/collection';
import type { InstallOffer } from '@/core/install';
import type { StorageAdapter } from '@/core/storage';

/** Set once the player dismisses the hint, so it never comes back. */
export const INSTALL_DISMISSED_KEY = 'tabimate.installHintDismissed';

/** Chrome's install event (not in the DOM typings). */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface InstallEnvironment {
  readonly window: Pick<Window, 'addEventListener' | 'matchMedia'>;
  /** iOS Safari's own flag for a home-screen app. */
  readonly standalone?: boolean | undefined;
}

const browserInstallEnvironment = (): InstallEnvironment => ({
  window,
  standalone: (navigator as Navigator & { standalone?: boolean }).standalone,
});

/**
 * Listens for the browser's install prompt from page load (it fires early) and
 * offers it once the player has finished INSTALL_HINT.afterDays days. Where the
 * browser has no prompt (iOS), the hint explains the share-menu route instead.
 */
export function createInstallOffer(
  storage: StorageAdapter,
  completedDays: () => number,
  env: InstallEnvironment = browserInstallEnvironment(),
): InstallOffer {
  let deferred: InstallPromptEvent | null = null;
  let installed =
    env.standalone === true || env.window.matchMedia('(display-mode: standalone)').matches;
  env.window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // shown from our hint instead of the browser's own bar
    deferred = event as InstallPromptEvent;
  });
  env.window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
  });

  return {
    shouldShow: () =>
      !installed &&
      storage.get(INSTALL_DISMISSED_KEY) !== true &&
      completedDays() >= INSTALL_HINT.afterDays,
    canPrompt: () => deferred !== null,
    async prompt() {
      const event = deferred;
      if (!event) return false;
      deferred = null; // a prompt can only be used once
      await event.prompt();
      const { outcome } = await event.userChoice;
      if (outcome === 'accepted') installed = true;
      return outcome === 'accepted';
    },
    dismiss: () => storage.set(INSTALL_DISMISSED_KEY, true),
  };
}
