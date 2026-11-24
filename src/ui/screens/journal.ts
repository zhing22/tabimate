import type { Portraits } from '@/core/portrait';
import { journalDetail } from '../components/journalDetail';
import { journalGrid, type JournalGrid } from '../components/journalGrid';
import { tabRow } from '../components/journalTabs';
import { COLLECTION_PAGE_CLASS, pageHeader } from '../components/pageHeader';
import { focus, h } from '../dom';
import type { Screen } from '../host';
import type { JournalCell, JournalTab } from '../journalView';

export interface JournalProps {
  /** "All animals" first, then the sets. */
  readonly tabs: readonly JournalTab[];
  readonly found: number;
  readonly total: number;
  readonly portraits?: Portraits | undefined;
}

export interface JournalActions {
  /** Back to the screen the journal was opened from. */
  close(): void;
}

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

/**
 * What the panel shows for a tab: a set's line and its grid (cells open
 * their page above it). Showing another tab stops the last grid watching for
 * cells scrolling into view.
 */
function journalPanel(panel: HTMLElement, props: JournalProps) {
  const openCell = cellOpener(panel, props.portraits);
  let grid: JournalGrid | null = null;
  return {
    show(tab: JournalTab) {
      grid?.destroy();
      grid = null;
      const shown = journalGrid(tab.cells, {
        portraits: props.portraits,
        open: (cell) => openCell(cell, shown.el.children[tab.cells.indexOf(cell)] as HTMLElement),
      });
      grid = shown;
      panel.replaceChildren(...[setHeader(tab), shown.el].filter((el) => el !== null));
    },
    destroy: () => grid?.destroy(),
  };
}

/**
 * The Field Journal: every animal ever found, sets to complete and the
 * achievements, in tabs. A found animal opens to its page above the grid.
 */
export const journalScreen: Screen<JournalProps, JournalActions> = (root, props, actions) => {
  const head = pageHeader(
    'journal-title',
    'Field Journal',
    `${props.found} of ${props.total} animals found`,
    () => actions.close(),
  );
  const panel = h('div', { class: 'journal__panel', role: 'tabpanel', id: 'journal-panel' });
  const content = journalPanel(panel, props);
  const { tabs } = props;
  const showTab = (index: number) => {
    row.select(index);
    content.show(tabs[index]!);
  };
  const row = tabRow(tabs, showTab);

  root.append(
    h(
      'section',
      { class: 'card card--journal journal', 'aria-labelledby': 'journal-title' },
      head.el,
      row.el,
      panel,
    ),
  );
  showTab(0);
  focus(head.heading);
  document.documentElement.classList.add(COLLECTION_PAGE_CLASS);
  return () => {
    content.destroy();
    document.documentElement.classList.remove(COLLECTION_PAGE_CLASS);
  };
};
