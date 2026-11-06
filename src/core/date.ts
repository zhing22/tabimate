import { LAUNCH_DATE_KEY, RESET_HOUR, TIMEZONE } from '@/config/game';
import type { DateKey } from './types';

const MS_PER_DAY = 86_400_000;
const KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

interface WallTime {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

// Constructing Intl formatters is slow; one per zone is enough.
function formatterFor(tz: string): Intl.DateTimeFormat {
  let formatter = formatters.get(tz);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    formatters.set(tz, formatter);
  }
  return formatter;
}

function wallTime(instant: Date, tz: string): WallTime {
  const parts = formatterFor(tz).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = Number(parts.find((p) => p.type === type)?.value);
    // Fail here rather than let NaN become the key "NaN-NaN-NaN" later.
    if (!Number.isInteger(value)) throw new Error(`Intl gave no ${type} for ${tz}`);
    return value;
  };
  return {
    year: part('year'),
    month: part('month'),
    day: part('day'),
    hour: part('hour'),
    minute: part('minute'),
    second: part('second'),
  };
}

function wallAsUtcMs(w: WallTime): number {
  return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
}

function keyFromUtcMs(ms: number): DateKey {
  return new Date(ms).toISOString().slice(0, 10);
}

function keyToUtcMs(key: DateKey): number {
  if (!isDateKey(key)) throw new RangeError(`Invalid date key "${key}"`);
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

/** The instant when the wall clock in tz shows the given local date and hour. */
function zonedInstantMs(key: DateKey, hour: number, tz: string): number {
  const wallMs = keyToUtcMs(key) + hour * 3_600_000;
  const offsetAt = (ms: number) => wallAsUtcMs(wallTime(new Date(ms), tz)) - ms;
  // Second pass corrects the guess when the offset differs at the target (DST).
  const guess = wallMs - offsetAt(wallMs);
  return wallMs - offsetAt(guess);
}

/** True for a real calendar date written as YYYY-MM-DD. */
export function isDateKey(value: string): boolean {
  const match = KEY_PATTERN.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  return keyFromUtcMs(Date.UTC(y, m - 1, d)) === value;
}

/** The key `days` calendar days after (or before, if negative) `key`. */
export function shiftKey(key: DateKey, days: number): DateKey {
  return keyFromUtcMs(keyToUtcMs(key) + days * MS_PER_DAY);
}

function checkResetHour(resetHour: number): void {
  if (!Number.isInteger(resetHour) || resetHour < 0 || resetHour > 23) {
    throw new RangeError(`Reset hour must be an integer 0–23 (got ${resetHour})`);
  }
}

/**
 * Key of the puzzle being played at `now`: the local date of the last reset.
 * Throws RangeError for an unknown time zone or a reset hour outside 0–23.
 */
export function dailyKey(now: Date, tz = TIMEZONE, resetHour = RESET_HOUR): DateKey {
  checkResetHour(resetHour);
  const w = wallTime(now, tz);
  const today = keyFromUtcMs(Date.UTC(w.year, w.month - 1, w.day));
  return w.hour < resetHour ? shiftKey(today, -1) : today;
}

/** Milliseconds from `now` until the next puzzle starts. Throws like dailyKey. */
export function msUntilNextReset(now: Date, tz = TIMEZONE, resetHour = RESET_HOUR): number {
  const nextKey = shiftKey(dailyKey(now, tz, resetHour), 1);
  return zonedInstantMs(nextKey, resetHour, tz) - now.getTime();
}

/** Day count since launch: the launch key is puzzle 1. Earlier keys give 0 or less. */
export function puzzleNumber(key: DateKey, launchKey: DateKey = LAUNCH_DATE_KEY): number {
  return Math.round((keyToUtcMs(key) - keyToUtcMs(launchKey)) / MS_PER_DAY) + 1;
}
