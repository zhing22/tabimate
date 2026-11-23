import type { Portraits } from '@/core/portrait';
import { badgeList } from '../components/badgeList';
import { journalDetail } from '../components/journalDetail';
import { journalGrid, type JournalGrid } from '../components/journalGrid';
import { tabRow } from '../components/journalTabs';
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

/** On <html> while the journal shows (journal.css: full screen on a phone). */
export const JOURNAL_CLASS = 'is-journal';

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

/** Opens a found animal's page above the grid, marking its cell; closing puts focus back. */
function cellOpener(panel: HTMLElement, portraits: Portraits | undefined) {
  return (cell: JournalCell, from: HTMLElement) => {
    panel.querySelector('.journal-detail')?.remove();
    panel.querySelector('.journal-cell--chosen')?.classList.remove('journal-cell--chosen');
    from.classList.add('journal-cell--chosen');
    const close = () => {
      detail.remove();
      from.classList.remove('journal-cell--chosen');
      from.querySelector('button')?.focus();
    };
    const detail = journalDetail(cell, close, portraits);
    panel.prepend(detail);
    // The panel scrolls: bring the page into view.
    detail.scrollIntoView?.({ block: 'nearest' });
  };
}

/** Title and count on the left, Back on the right: one compact row. */
function header(found: number, total: number, back: HTMLElement): HTMLElement {
  return h(
    'div',
    { class: 'journal__head' },
    h(
      'div',
      { class: 'journal__title' },
      h('h1', { id: 'journal-title', class: 'title title--sm', tabindex: -1 }, 'Field Journal'),
      h('p', { class: 'meta' }, `${found} of ${total} animals found`),
    ),
    back,
  );
}

/**
 * The Field Journal: every animal ever found, sets to complete and the
 * achievements, in tabs. A found animal opens to its page above the grid.
 */
export const journalScreen: Screen<JournalProps, JournalActions> = (root, props, actions) => {
  const back = h('button', { class: 'button journal__back', type: 'button' }, 'Back');
  back.addEventListener('click', () => actions.close());
  const panel = h('div', { class: 'journal__panel', role: 'tabpanel', id: 'journal-panel' });
  const openCell = cellOpener(panel, props.portraits);
  const tabs = [...props.tabs, BADGES_TAB];
  let grid: JournalGrid | null = null;

  function showTab(index: number) {
    row.select(index);
    grid?.destroy();
    grid = null;
    const tab = tabs[index]!;
    if (!('cells' in tab)) {
      panel.replaceChildren(badgeList(props.badges));
      return;
    }
    const shown = journalGrid(tab.cells, {
      portraits: props.portraits,
      open: (cell) => openCell(cell, shown.el.children[tab.cells.indexOf(cell)] as HTMLElement),
    });
    grid = shown;
    panel.replaceChildren(...[setHeader(tab), shown.el].filter((el) => el !== null));
  }
  const row = tabRow(tabs, showTab);

  root.append(
    h(
      'section',
      { class: 'card card--journal journal', 'aria-labelledby': 'journal-title' },
      header(props.found, props.total, back),
      row.el,
      panel,
    ),
  );
  showTab(0);
  focus(root.querySelector<HTMLElement>('#journal-title'));
  document.documentElement.classList.add(JOURNAL_CLASS);
  return () => {
    grid?.destroy();
    document.documentElement.classList.remove(JOURNAL_CLASS);
  };
};
