import type { Portraits } from '@/core/portrait';
import { journalDetail } from '../components/journalDetail';
import { journalGrid, type JournalGrid } from '../components/journalGrid';
import { tabRow } from '../components/journalTabs';
import { card } from '../components/card';
import { pageTitle, type PageActions, type PageProps } from '../components/pageHeader';
import { settingsMenu } from '../components/settingsMenu';
import { focus, h } from '../dom';
import type { Screen } from '../host';
import { openPage } from '../layout/page';
import type { JournalCell, JournalTab } from '../journalView';

export interface JournalProps extends PageProps {
  /** "All animals" first, then the sets. */
  readonly tabs: readonly JournalTab[];
  readonly found: number;
  readonly total: number;
  readonly portraits?: Portraits | undefined;
}

export type JournalActions = PageActions;

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
    // Escape closes the animal's page first, not the whole journal.
    detail.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      close();
    });
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
  const heading = pageTitle('journal-title', 'Field Journal');
  const settings = props.sound ? settingsMenu(props.sound) : null;
  const panel = h('div', { class: 'journal__panel', role: 'tabpanel', id: 'journal-panel' });
  const content = journalPanel(panel, props);
  const { tabs } = props;
  const showTab = (index: number) => {
    row.select(index);
    content.show(tabs[index]!);
  };
  const row = tabRow(tabs, showTab);

  const shown = card({
    className: 'card--journal journal',
    title: heading,
    meta: `${props.found} of ${props.total} animals found`,
    back: () => actions.close(),
    close: actions.dismiss ?? (() => actions.close()),
    tools: [settings?.el],
    body: [row.el, panel],
  });
  root.append(shown.el);
  showTab(0);
  const closePage = openPage(shown.el, () => actions.close());
  focus(heading);
  return () => {
    closePage();
    settings?.destroy();
    content.destroy();
  };
};
