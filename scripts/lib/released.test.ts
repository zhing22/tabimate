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
    // Recording never overwrites: the changed day keeps its original print.
    expect(result.updated).toEqual({
      '2026-11-17': fingerprint(day(1)),
      '2026-11-18': fingerprint(day(4)),
    });
  });

  it('leaves days that are not live yet alone', () => {
    const result = checkReleased(puzzles, '2026-11-16', {});
    expect(result).toEqual({ changed: [], unrecorded: [], updated: {} });
  });
});
