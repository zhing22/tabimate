// Month calendars over puzzle keys, for the history screen. Pure: weekdays
// come from Date.UTC on the key's own numbers, so no time zone is involved.
import { SCORE_BANDS, type ScoreBand } from '@/config/history';
import type { DateKey } from './types';

export interface Month {
  readonly year: number;
  /** 1 to 12. */
  readonly month: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

export const monthOf = (key: DateKey): Month => {
  const [year, month] = key.split('-').map(Number);
  return { year: year ?? 1970, month: month ?? 1 };
};

/** The month n months after (or before, for negative n). */
export function shiftMonth({ year, month }: Month, n: number): Month {
  const index = year * 12 + (month - 1) + n;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** -1, 0 or 1, like a sort comparator. */
export const compareMonths = (a: Month, b: Month): number =>
  Math.sign(a.year * 12 + a.month - (b.year * 12 + b.month));

/**
 * The month as weeks, Monday first: each week is seven slots, a DateKey for a
 * day of this month and null for padding before the 1st or after the last day.
 */
export function monthWeeks({ year, month }: Month): (DateKey | null)[][] {
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7; // Monday = 0
  const slots: (DateKey | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: days }, (_, i) => `${year}-${pad(month)}-${pad(i + 1)}`),
  ];
  while (slots.length % 7 !== 0) slots.push(null);
  return Array.from({ length: slots.length / 7 }, (_, w) => slots.slice(w * 7, w * 7 + 7));
}

/** The highest band whose minimum the score reaches. */
export const scoreBand = (score: number): ScoreBand =>
  [...SCORE_BANDS].reverse().find((band) => score >= band.min) ?? SCORE_BANDS[0];
