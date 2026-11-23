const pad = (n: number): string => String(n).padStart(2, '0');

/** 3_723_000 -> "01:02:03". Rounds up, so the display reaches 00:00:00 exactly at zero. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

/** Whole seconds left, rounded up: 0.2 s left still shows "1". */
export const secondsLeft = (ms: number): number => Math.max(0, Math.ceil(ms / 1000));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A puzzle key as a date people read: "2026-11-19" -> "19 Nov 2026" (no time zones involved). */
export function formatDateKey(key: string): string {
  const [year, month, day] = key.split('-').map(Number);
  const name = MONTHS[(month ?? 1) - 1];
  return name && year && day ? `${day} ${name} ${year}` : key;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** { year: 2026, month: 11 } -> "November 2026". */
export const formatMonth = ({ year, month }: { year: number; month: number }): string =>
  `${MONTH_NAMES[month - 1] ?? ''} ${year}`;

/** A share of players as the results show it: "12%", "<1%" for a few, "0%" for none. */
export const formatShare = (percent: number): string =>
  percent > 0 && percent < 0.5 ? '<1%' : `${Math.round(percent)}%`;
