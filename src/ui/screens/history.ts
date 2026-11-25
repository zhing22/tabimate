import { SCORE_BANDS } from '@/config/history';
import { compareMonths, shiftMonth, type Month } from '@/core/calendar';
import type { Stats } from '@/core/streak';
import type { AnimalLookup, DateKey } from '@/core/types';
import { card } from '../components/card';
import { dayDetail } from '../components/dayDetail';
import { pageTitle, type PageActions, type PageProps } from '../components/pageHeader';
import { settingsMenu } from '../components/settingsMenu';
import { historyCalendar } from '../components/historyCalendar';
import { focus, h } from '../dom';
import { formatMonth } from '../format';
import type { Screen } from '../host';
import { openPage } from '../layout/page';
import { dayDetail as detailOf, historyWeeks, monthRange, type HistoryDay } from '../historyView';

export interface HistoryProps extends PageProps {
  readonly stats: Stats;
  readonly animals: AnimalLookup;
  readonly todayKey: DateKey;
}

export type HistoryActions = PageActions;

const legend = () =>
  h(
    'ul',
    { class: 'calendar-legend' },
    ...SCORE_BANDS.map((band) =>
      h(
        'li',
        {},
        h('span', {
          class: 'calendar-legend__swatch',
          style: `--day: var(${band.colour})`,
          'aria-hidden': 'true',
        }),
        `${band.label} (${band.min}+)`,
      ),
    ),
  );

/**
 * Past days on a month calendar, coloured by score; tapping a played day shows
 * its score and team. Everything comes from the local history.
 */
export const historyScreen: Screen<HistoryProps, HistoryActions> = (root, props, actions) => {
  const { first, last } = monthRange(props.stats, props.todayKey);
  let month: Month = last;
  const title = h('h2', { class: 'calendar-nav__title', 'aria-live': 'polite' });
  const prev = h('button', { class: 'button calendar-nav__step', type: 'button' }, '‹');
  const next = h('button', { class: 'button calendar-nav__step', type: 'button' }, '›');
  prev.setAttribute('aria-label', 'Previous month');
  next.setAttribute('aria-label', 'Next month');
  const grid = h('div', {});
  const detail = h('div', {});

  const pick = (day: HistoryDay) => {
    if (day.entry) detail.replaceChildren(dayDetail(detailOf(day.entry, props.animals)));
  };

  function render() {
    title.textContent = formatMonth(month);
    prev.disabled = compareMonths(month, first) <= 0;
    next.disabled = compareMonths(month, last) >= 0;
    grid.replaceChildren(historyCalendar(historyWeeks(month, props.stats, props.todayKey), pick));
    detail.replaceChildren();
  }
  const step = (n: number) => () => {
    month = shiftMonth(month, n);
    render();
  };
  prev.addEventListener('click', step(-1));
  next.addEventListener('click', step(1));
  const heading = pageTitle('history-title', 'History');
  const settings = props.sound ? settingsMenu(props.sound) : null;
  const days = props.stats.history.length;
  const shown = card({
    className: 'card--journal history',
    title: heading,
    meta: days === 1 ? '1 day played' : `${days} days played`,
    back: () => actions.close(),
    close: actions.dismiss ?? (() => actions.close()),
    tools: [settings?.el],
    body: [h('div', { class: 'calendar-nav' }, prev, title, next), grid, detail, legend()],
  });
  root.append(shown.el);
  render();
  const closePage = openPage(shown.el, () => actions.close());
  focus(heading);
  return () => {
    closePage();
    settings?.destroy();
  };
};
