import { describe, expect, it } from 'vitest';
import { SCORE_BANDS } from '@/config/history';
import { compareMonths, monthOf, monthWeeks, scoreBand, shiftMonth } from './calendar';

describe('calendar', () => {
  it('reads the month of a key, and steps across year ends', () => {
    expect(monthOf('2026-11-19')).toEqual({ year: 2026, month: 11 });
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2027, month: 1 }, -1)).toEqual({ year: 2026, month: 12 });
    expect(compareMonths({ year: 2026, month: 11 }, { year: 2027, month: 1 })).toBe(-1);
  });

  it('lays a month out in Monday-first weeks', () => {
    // 1 November 2026 is a Sunday: six blanks before it, 30 days, padded to 5 weeks.
    const weeks = monthWeeks({ year: 2026, month: 11 });
    expect(weeks[0]).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(weeks.at(-1)?.filter(Boolean).at(-1)).toBe('2026-11-30');
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
  });

  it('knows leap years', () => {
    expect(monthWeeks({ year: 2028, month: 2 }).flat().filter(Boolean)).toHaveLength(29);
  });

  it('puts a score in the highest band it reaches', () => {
    expect(scoreBand(0)).toBe(SCORE_BANDS[0]);
    expect(scoreBand(SCORE_BANDS[1].min - 1)).toBe(SCORE_BANDS[0]);
    expect(scoreBand(SCORE_BANDS[1].min)).toBe(SCORE_BANDS[1]);
    expect(scoreBand(10_000)).toBe(SCORE_BANDS.at(-1));
  });
});
