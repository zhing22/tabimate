import { scoreBand } from '@/core/calendar';
import { h } from '../dom';
import { formatDateKey } from '../format';
import type { HistoryDay } from '../historyView';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function dayCell(day: HistoryDay, pick: (day: HistoryDay) => void): HTMLElement {
  const classes = ['calendar__day'];
  if (day.today) classes.push('calendar__day--today');
  if (day.frozen) classes.push('calendar__day--frozen');
  if (!day.entry) {
    const label = day.frozen ? `${formatDateKey(day.key)}: saved by a streak freeze` : null;
    return h(
      'span',
      { class: classes.join(' '), ...(label ? { 'aria-label': label, role: 'img' } : {}) },
      day.frozen ? '❄' : day.day,
    );
  }
  const band = scoreBand(day.entry.score);
  const button = h(
    'button',
    {
      class: [...classes, 'calendar__day--played'].join(' '),
      type: 'button',
      style: `--day: var(${band.colour}); --day-ink: var(${band.colour}-ink)`,
      'aria-label': `${formatDateKey(day.key)}: ${day.entry.score} points`,
    },
    day.day,
  );
  button.addEventListener('click', () => pick(day));
  return button;
}

/**
 * A month as a grid, Monday first. Played days are buttons coloured by their
 * score band; a day a freeze covered shows a snowflake; others are just dates.
 */
export function historyCalendar(
  weeks: readonly (readonly (HistoryDay | null)[])[],
  pick: (day: HistoryDay) => void,
): HTMLElement {
  return h(
    'div',
    { class: 'calendar' },
    ...WEEKDAYS.map((d) => h('span', { class: 'calendar__weekday', 'aria-hidden': 'true' }, d)),
    ...weeks
      .flat()
      .map((day) =>
        day ? dayCell(day, pick) : h('span', { class: 'calendar__blank', 'aria-hidden': 'true' }),
      ),
  );
}
