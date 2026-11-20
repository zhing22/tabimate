import type { InstallOffer } from '@/core/install';
import { h } from '../dom';

/**
 * "Install Tabimate", once the player has a few days behind them. Where the
 * browser has its own install dialog, a button opens it; elsewhere (iOS) a line
 * says how. "Not now" hides it for good. Null when there is nothing to offer.
 */
export function installHint(offer: InstallOffer | undefined): HTMLElement | null {
  if (!offer?.shouldShow()) return null;
  const dismiss = h('button', { class: 'install-hint__dismiss', type: 'button' }, 'Not now');
  const install = offer.canPrompt()
    ? h('button', { class: 'button button--small', type: 'button' }, 'Install')
    : null;
  const el = h(
    'aside',
    { class: 'install-hint', 'aria-label': 'Install Tabimate' },
    h('span', { class: 'install-hint__icon', 'aria-hidden': 'true' }, '📲'),
    h(
      'span',
      { class: 'install-hint__body' },
      h('strong', {}, 'Install Tabimate'),
      h(
        'span',
        { class: 'install-hint__text' },
        install
          ? 'Play from your home screen, even offline.'
          : 'Add it to your home screen from your browser’s Share menu to play offline.',
      ),
    ),
    install,
    dismiss,
  );
  dismiss.addEventListener('click', () => {
    offer.dismiss();
    el.remove();
  });
  install?.addEventListener('click', () => {
    void offer.prompt().then((accepted) => {
      if (accepted) el.remove();
    });
  });
  return el;
}
