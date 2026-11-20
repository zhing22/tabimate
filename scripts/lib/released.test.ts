import { describe, expect, it } from 'vitest';
import { checkReleased, fingerprint } from './released';

const day = (level: number) => ({ date: 'x', prompts: [{ id: 'p', answers: [{ level }] }] });

describe('fingerprint', () => {
  it('ignores key order and formatting, not content', () => {
    expect(fingerprint({ a: 1, b: [1, 2] })).toBe(fingerprint(JSON.parse('{"b":[1,2],"a":1}')));
    expect(fingerprint(day(5))).not.toBe(fingerprint(day(4)));
  });
});

describe('checkReleased', () => {
  const puzzles = new Map<string, unknown>([
    ['2026-11-17', day(5)],
    ['2026-11-18', day(4)],
    ['2026-11-19', day(3)],
  ]);

  it('flags a released day that changed, and lists unrecorded ones', () => {
    const record = { '2026-11-17': fingerprint(day(1)) };
    const result = checkReleased(puzzles, '2026-11-18', record);
    expect(result.changed).toEqual(['2026-11-17']);
    expect(result.unrecorded).toEqual(['2026-11-18']);
    expect(result.overdue).toEqual([]); // today's day may wait for the record job
    // Recording never overwrites: the changed day keeps its original print.
    expect(result.updated).toEqual({
      '2026-11-17': fingerprint(day(1)),
      '2026-11-18': fingerprint(day(4)),
    });
  });

  it('leaves days that are not live yet alone', () => {
    const result = checkReleased(puzzles, '2026-11-16', {});
    expect(result).toEqual({
      changed: [],
      unrecorded: [],
      overdue: [],
      removed: [],
      late: [],
      updated: {},
    });
  });
});

describe('checkReleased: falling behind', () => {
  it('marks unrecorded days before today as overdue', () => {
    const puzzles = new Map<string, unknown>([
      ['2026-11-17', day(5)],
      ['2026-11-18', day(4)],
    ]);
    const result = checkReleased(puzzles, '2026-11-18', {});
    expect(result.unrecorded).toEqual(['2026-11-17', '2026-11-18']);
    expect(result.overdue).toEqual(['2026-11-17']);
  });
});

describe('checkReleased: bonus quizzes', () => {
  it('freezes a quiz ("date/bonus") from the day it goes live, like its puzzle', () => {
    const files = new Map<string, unknown>([
      ['2026-11-22', day(5)],
      ['2026-11-22/bonus', { items: [1] }],
    ]);
    expect(checkReleased(files, '2026-11-21', {}).unrecorded).toEqual([]);
    const live = checkReleased(files, '2026-11-22', {});
    expect(live.unrecorded).toEqual(['2026-11-22', '2026-11-22/bonus']);
    const changed = checkReleased(
      new Map([['2026-11-22/bonus', { items: [2] }]]),
      '2026-11-23',
      live.updated,
    );
    expect(changed.changed).toEqual(['2026-11-22/bonus']);
  });
});

describe('checkReleased: removed and late files', () => {
  it('lists a recorded live file that no longer exists, but not a future one', () => {
    const record = { '2026-11-22/bonus': 'x', '2026-11-29/bonus': 'y' };
    const result = checkReleased(new Map(), '2026-11-23', record);
    expect(result.removed).toEqual(['2026-11-22/bonus']);
  });

  it('keeps a quiz that appears after its puzzle was recorded out of the record', () => {
    const files = new Map<string, unknown>([
      ['2026-11-22', day(5)],
      ['2026-11-22/bonus', { items: [1] }],
    ]);
    const result = checkReleased(files, '2026-11-22', { '2026-11-22': fingerprint(day(5)) });
    expect(result.late).toEqual(['2026-11-22/bonus']);
    expect(result.unrecorded).toEqual([]);
    expect(result.updated).toEqual({ '2026-11-22': fingerprint(day(5)) });
  });
});
