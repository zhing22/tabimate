import { describe, expect, it } from 'vitest';
import { INSTALL_HINT } from '@/config/collection';
import { createInstallOffer, INSTALL_DISMISSED_KEY, type InstallEnvironment } from './install';
import { createMemoryStorageAdapter } from './storage';

function fakeWindow(standalone = false) {
  const target = new EventTarget();
  const env: InstallEnvironment = {
    window: {
      addEventListener: target.addEventListener.bind(target) as Window['addEventListener'],
      matchMedia: () => ({ matches: standalone }) as MediaQueryList,
    },
  };
  /** The browser offering to install: what Chrome fires once the app qualifies. */
  const offerInstall = (outcome: 'accepted' | 'dismissed') => {
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: () => Promise.resolve(),
      userChoice: Promise.resolve({ outcome }),
    });
    target.dispatchEvent(event);
    return event;
  };
  return { env, offerInstall, installed: () => target.dispatchEvent(new Event('appinstalled')) };
}

describe('install offer', () => {
  const days = (n: number) => () => n;

  it(`shows only after ${INSTALL_HINT.afterDays} finished days`, () => {
    const storage = createMemoryStorageAdapter();
    expect(
      createInstallOffer(storage, days(INSTALL_HINT.afterDays - 1), fakeWindow().env).shouldShow(),
    ).toBe(false);
    expect(
      createInstallOffer(storage, days(INSTALL_HINT.afterDays), fakeWindow().env).shouldShow(),
    ).toBe(true);
  });

  it('never shows once dismissed (kept in storage), or when already installed', () => {
    const storage = createMemoryStorageAdapter();
    const offer = createInstallOffer(storage, days(9), fakeWindow().env);
    offer.dismiss();
    expect(storage.get(INSTALL_DISMISSED_KEY)).toBe(true);
    expect(createInstallOffer(storage, days(9), fakeWindow().env).shouldShow()).toBe(false);
    const fresh = createMemoryStorageAdapter();
    expect(createInstallOffer(fresh, days(9), fakeWindow(true).env).shouldShow()).toBe(false);
    const page = fakeWindow();
    const offerLater = createInstallOffer(fresh, days(9), page.env);
    page.installed();
    expect(offerLater.shouldShow()).toBe(false);
  });

  it("keeps the browser's install prompt and shows it on request, once", async () => {
    const page = fakeWindow();
    const offer = createInstallOffer(createMemoryStorageAdapter(), days(9), page.env);
    expect(offer.canPrompt()).toBe(false);
    const event = page.offerInstall('accepted');
    expect(event.defaultPrevented).toBe(true); // our hint replaces the browser's bar
    expect(offer.canPrompt()).toBe(true);
    expect(await offer.prompt()).toBe(true);
    expect(offer.canPrompt()).toBe(false);
    expect(offer.shouldShow()).toBe(false);
  });
});
