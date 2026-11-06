import { afterEach, describe, expect, it, vi } from 'vitest';
import { dailyKey, isDateKey, msUntilNextReset, puzzleNumber, shiftKey } from './date';

const at = (iso: string) => new Date(iso);
const SECOND = 1000;
const HOUR = 3_600_000;

// Noon SGT (UTC+8) is 04:00 UTC.
describe('dailyKey (reset at 12:00 Asia/Singapore)', () => {
  it.each([
    ['2026-11-07T03:59:59Z', '2026-11-06', '11:59:59 SGT is still the previous puzzle'],
    ['2026-11-07T04:00:00Z', '2026-11-07', '12:00:00 SGT starts the new puzzle'],
    ['2026-11-06T15:59:59Z', '2026-11-06', '23:59:59 SGT'],
    ['2026-11-06T16:00:00Z', '2026-11-06', 'midnight SGT does not flip the key'],
    ['2027-01-01T03:59:59Z', '2026-12-31', 'new year morning is still last year'],
    ['2027-01-01T04:00:00Z', '2027-01-01', 'new year puzzle at noon'],
    ['2028-03-01T03:00:00Z', '2028-02-29', 'leap day carries over to 1 March morning'],
  ])('%s -> %s (%s)', (iso, key) => {
    expect(dailyKey(at(iso))).toBe(key);
  });

  it('supports another zone and reset hour', () => {
    expect(dailyKey(at('2026-11-06T23:59:59Z'), 'UTC', 0)).toBe('2026-11-06');
    expect(dailyKey(at('2026-11-07T00:00:00Z'), 'UTC', 0)).toBe('2026-11-07');
  });
});

describe('dailyKey and msUntilNextReset reject bad settings', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const now = at('2026-11-07T04:00:00Z');

  it('rejects an unknown time zone', () => {
    expect(() => dailyKey(now, 'Mars/Olympus_Mons')).toThrow(RangeError);
    expect(() => msUntilNextReset(now, 'Mars/Olympus_Mons')).toThrow(RangeError);
  });

  it.each([-1, 24, 12.5, Number.NaN])('rejects reset hour %s', (hour) => {
    expect(() => dailyKey(now, 'UTC', hour)).toThrow(/Reset hour must be an integer 0–23/);
    expect(() => msUntilNextReset(now, 'UTC', hour)).toThrow(RangeError);
  });

  it('accepts the edge hour 23', () => {
    expect(dailyKey(at('2026-11-06T22:59:59Z'), 'UTC', 23)).toBe('2026-11-05');
    expect(dailyKey(at('2026-11-06T23:00:00Z'), 'UTC', 23)).toBe('2026-11-06');
  });

  it('throws if Intl leaves out a date part instead of making a NaN key', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'formatToParts').mockReturnValue([
      { type: 'year', value: '2026' },
    ]);
    expect(() => dailyKey(now)).toThrow(/Intl gave no month/);
  });
});

describe('msUntilNextReset', () => {
  it.each([
    ['2026-11-07T04:00:00Z', 24 * HOUR, 'right at noon: a full day'],
    ['2026-11-07T03:59:59Z', SECOND, 'one second before noon'],
    ['2026-11-06T15:59:59Z', 12 * HOUR + SECOND, 'across SGT midnight'],
    ['2026-11-06T16:00:00Z', 12 * HOUR, 'at SGT midnight'],
    ['2026-11-06T23:59:59Z', 4 * HOUR + SECOND, 'across UTC midnight'],
    ['2026-12-31T20:00:00Z', 8 * HOUR, 'across the new year'],
  ])('%s -> %i ms (%s)', (iso, ms) => {
    expect(msUntilNextReset(at(iso))).toBe(ms);
  });

  it('handles milliseconds', () => {
    expect(msUntilNextReset(at('2026-11-07T03:59:59.250Z'))).toBe(750);
  });

  it('accounts for daylight saving in zones that have it', () => {
    // New York leaves DST on 2026-11-01, so noon to noon is 25 hours.
    expect(msUntilNextReset(at('2026-10-31T16:00:00Z'), 'America/New_York', 12)).toBe(25 * HOUR);
  });
});

describe('puzzleNumber', () => {
  it('counts from 1 at launch', () => {
    expect(puzzleNumber('2026-11-06', '2026-11-06')).toBe(1);
    expect(puzzleNumber('2026-11-07', '2026-11-06')).toBe(2);
    expect(puzzleNumber('2027-11-06', '2026-11-06')).toBe(366);
  });

  it('defaults to the configured launch date', () => {
    expect(puzzleNumber('2026-11-06')).toBe(1);
  });

  it('gives 0 or less before launch', () => {
    expect(puzzleNumber('2026-11-05', '2026-11-06')).toBe(0);
  });

  it('rejects malformed keys', () => {
    expect(() => puzzleNumber('2026-11-6', '2026-11-06')).toThrow(RangeError);
  });
});

describe('isDateKey', () => {
  it.each([
    ['2026-11-06', true],
    ['2028-02-29', true],
    ['2026-02-29', false],
    ['2026-13-01', false],
    ['2026-11-6', false],
    ['../secrets', false],
  ])('%s -> %s', (value, ok) => {
    expect(isDateKey(value)).toBe(ok);
  });
});

describe('shiftKey', () => {
  it('moves across month, year and leap-day boundaries', () => {
    expect(shiftKey('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftKey('2028-03-01', -1)).toBe('2028-02-29');
    expect(shiftKey('2026-11-06', 0)).toBe('2026-11-06');
  });
});
