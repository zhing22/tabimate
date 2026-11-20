import type { Portraits } from '@/core/portrait';
import { badgeList } from '../components/badgeList';
import { journalDetail } from '../components/journalDetail';
import { journalGrid } from '../components/journalGrid';
import { nextTabIndex } from '../components/tabKeys';
import { focus, h } from '../dom';
import type { Screen } from '../host';
import type { BadgeLine, JournalCell, JournalTab } from '../journalView';

export interface JournalProps {
  /** "All animals" first, then the sets. */
  readonly tabs: readonly JournalTab[];
  readonly badges: readonly BadgeLine[];
  readonly found: number;
  readonly total: number;
  readonly portraits?: Portraits | undefined;
}

export interface JournalActions {
  /** Back to the screen the journal was opened from. */
  close(): void;
}

const BADGES_TAB = { id: 'badges', label: 'Achievements', icon: '🏆' };

/** A set's line: "Big cats · 3 of 7", stamped once complete. */
function setHeader(tab: JournalTab): HTMLElement | null {
  if (!tab.progress) return null;
  const { found, total, complete } = tab.progress;
  return h(
    'p',
    { class: 'journal__set' },
    `${tab.label} · ${found} of ${total}`,
    complete ? h('span', { class: 'journal__stamp' }, 'Complete!') : null,
  );
}

/**
 * The Field Journal: every animal ever found, sets to complete and the
 * achievements, in tabs. A found animal opens to its page above the grid.
 */
export const journalScreen: Screen<JournalProps, JournalActions> = (root, props, actions) => {
  const back = h('button', { class: 'button', type: 'button' }, 'Back');
  back.addEventListener('click', () => actions.close());
  const panel = h('div', { class: 'journal__panel', role: 'tabpanel', id: 'journal-panel' });
  const tabList = h('div', { class: 'journal__tabs', role: 'tablist', 'aria-label': 'Journal' });

  function openCell(cell: JournalCell, from: HTMLElement) {
    panel.querySelector('.journal-detail')?.remove();
    const detail = journalDetail(cell, () => {
      detail.remove();
      from.querySelector('button')?.focus();
    });
    panel.prepend(detail);
  }

  const tabs = [...props.tabs, BADGES_TAB];
  const buttons = tabs.map((tab, i) => {
    const button = h(
      'button',
      { class: 'journal__tab', type: 'button', role: 'tab', 'aria-controls': 'journal-panel' },
      h('span', { 'aria-hidden': 'true' }, tab.icon),
      ` ${tab.label}`,
    );
    button.addEventListener('click', () => showTab(i));
    return button;
  });
  tabList.append(...buttons);
  // Roving tabindex: Tab reaches only the selected tab; arrows, Home and End move along.
  tabList.addEventListener('keydown', (event) => {
    const current = buttons.findIndex((b) => b.getAttribute('aria-selected') === 'true');
    const next = nextTabIndex(event.key, current, buttons.length);
    if (next === null) return;
    event.preventDefault();
    showTab(next);
    buttons[next]!.focus();
  });

  function showTab(index: number) {
    buttons.forEach((button, i) => {
      button.setAttribute('aria-selected', String(i === index));
      button.tabIndex = i === index ? 0 : -1;
    });
    const tab = tabs[index]!;
    if (!('cells' in tab)) {
      panel.replaceChildren(badgeList(props.badges));
      return;
    }
    const grid = journalGrid(tab.cells, {
      portraits: props.portraits,
      open: (cell) => openCell(cell, grid.children[tab.cells.indexOf(cell)] as HTMLElement),
    });
    panel.replaceChildren(...[setHeader(tab), grid].filter((el) => el !== null));
  }

  root.append(
    h(
      'section',
      { class: 'card card--journal journal', 'aria-labelledby': 'journal-title' },
      h('h1', { id: 'journal-title', class: 'title title--sm', tabindex: -1 }, 'Field Journal'),
      h('p', { class: 'meta' }, `${props.found} of ${props.total} animals found`),
      tabList,
      panel,
      back,
    ),
  );
  showTab(0);
  focus(root.querySelector<HTMLElement>('#journal-title'));
  // Nothing to stop: every listener is on elements the host removes with the screen.
  return () => {};
};
