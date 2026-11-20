import { SCORE_BANDS } from '@/config/history';
import { compareMonths, shiftMonth, type Month } from '@/core/calendar';
import type { Stats } from '@/core/streak';
import type { AnimalLookup, DateKey } from '@/core/types';
import { dayDetail } from '../components/dayDetail';
import { historyCalendar } from '../components/historyCalendar';
import { focus, h } from '../dom';
import { formatMonth } from '../format';
import type { Screen } from '../host';
import { dayDetail as detailOf, historyWeeks, monthRange, type HistoryDay } from '../historyView';

export interface HistoryProps {
  readonly stats: Stats;
  readonly animals: AnimalLookup;
  readonly todayKey: DateKey;
}

export interface HistoryActions {
  /** Back to the screen the history was opened from. */
  close(): void;
}

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
  const back = h('button', { class: 'button', type: 'button' }, 'Back');
  back.addEventListener('click', () => actions.close());

  const heading = h('h1', { class: 'title title--sm', tabindex: -1 }, 'History');
  root.append(
    h(
      'section',
      { class: 'card card--journal history', 'aria-label': 'History' },
      heading,
      h('p', { class: 'meta' }, `${props.stats.history.length} days played`),
      h('div', { class: 'calendar-nav' }, prev, title, next),
      grid,
      legend(),
      detail,
      back,
    ),
  );
  render();
  focus(heading);
  // Nothing to stop: every listener is on elements the host removes with the screen.
  return () => {};
};
