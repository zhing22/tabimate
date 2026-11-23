import { h } from '../dom';
import { nextTabIndex } from './tabKeys';

/**
 * The tab row, with a roving tabindex: Tab reaches only the selected tab;
 * arrows, Home and End move along. `select` marks a tab and scrolls it into
 * view (the row scrolls sideways); `onPick` hears clicks and key moves.
 */
export function tabRow(
  tabs: readonly { icon: string; label: string }[],
  onPick: (index: number) => void,
) {
  const el = h('div', { class: 'journal__tabs', role: 'tablist', 'aria-label': 'Journal' });
  const buttons = tabs.map((tab, i) => {
    const button = h(
      'button',
      { class: 'journal__tab', type: 'button', role: 'tab', 'aria-controls': 'journal-panel' },
      h('span', { 'aria-hidden': 'true' }, tab.icon),
      ` ${tab.label}`,
    );
    button.addEventListener('click', () => onPick(i));
    return button;
  });
  el.append(...buttons);
  el.addEventListener('keydown', (event) => {
    const current = buttons.findIndex((b) => b.getAttribute('aria-selected') === 'true');
    const next = nextTabIndex(event.key, current, buttons.length);
    if (next === null) return;
    event.preventDefault();
    onPick(next);
    buttons[next]!.focus();
  });
  const select = (index: number) => {
    buttons.forEach((button, i) => {
      button.setAttribute('aria-selected', String(i === index));
      button.tabIndex = i === index ? 0 : -1;
    });
    buttons[index]!.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  };
  return { el, select };
}
