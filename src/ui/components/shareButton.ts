import type { ShareOutcome } from '@/core/share';
import { h } from '../dom';
import type { Delay } from '../frames';

const SHARE_LABEL = 'Share';
const SAID: Readonly<Record<ShareOutcome, string>> = {
  shared: 'Shared!',
  copied: 'Copied!',
  cancelled: SHARE_LABEL,
  failed: "Couldn't copy",
};

/** How long the button says "Copied!" before it reads "Share" again. */
export const SAID_MS = 2_000;

/**
 * The Share button: says how it went for a moment, and tells screen readers.
 * Taps while a share is still going are ignored: a second navigator.share()
 * with the sheet open fails, falls back to copying, and would say "Copied!"
 * while the sheet is still up.
 */
export function shareButton(onShare: () => Promise<ShareOutcome>, delay: Delay) {
  const button = h('button', { class: 'button button--primary', type: 'button' }, SHARE_LABEL);
  const status = h('p', { class: 'sr-only', role: 'status' });
  let busy = false;
  let cancelReset = () => {};
  button.addEventListener('click', () => {
    if (busy) return;
    busy = true;
    button.setAttribute('aria-busy', 'true');
    void onShare().then((result) => {
      busy = false;
      button.removeAttribute('aria-busy');
      button.textContent = SAID[result];
      // Cleared, then set on a microtask: the same "Copied!" twice is still a
      // change, so a screen reader reads it out again.
      status.textContent = '';
      if (result !== 'cancelled') queueMicrotask(() => (status.textContent = SAID[result]));
      cancelReset();
      cancelReset = delay(() => (button.textContent = SHARE_LABEL), SAID_MS);
    });
  });
  return {
    el: h('div', { class: 'results__share' }, button, status),
    destroy: () => cancelReset(),
  };
}
