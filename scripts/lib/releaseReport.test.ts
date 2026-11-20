import { describe, expect, it } from 'vitest';
import { fingerprint } from './released';
import { fileOf, releaseReport } from './releaseReport';

const puzzle = (level: number) => ({ prompts: [{ answers: [{ level }] }] });
const quiz = (answer: boolean) => ({ items: [{ answer }] });
const FILE = 'scripts/released-puzzles.json';
const report = (
  live: [string, unknown][],
  today: string,
  record: Record<string, string>,
  recording = false,
) => releaseReport(new Map(live), today, record, recording, FILE);

describe('fileOf', () => {
  it('names the file a record key stands for', () => {
    expect(fileOf('2026-11-22')).toBe('puzzles/2026-11-22.json');
    expect(fileOf('2026-11-22/bonus')).toBe('bonus/2026-11-22.json');
  });
});

describe('releaseReport', () => {
  const sunday: [string, unknown][] = [
    ['2026-11-22', puzzle(5)],
    ['2026-11-22/bonus', quiz(true)],
  ];
  const recorded = {
    '2026-11-22': fingerprint(puzzle(5)),
    '2026-11-22/bonus': fingerprint(quiz(true)),
  };

  it('passes quietly when every live file matches the record', () => {
    expect(report(sunday, '2026-11-23', recorded)).toEqual({
      problems: [],
      warnings: [],
      updated: null,
      recorded: 0,
    });
  });

  it('fails a live puzzle or quiz that changed, naming its file', () => {
    const changed = report(
      [
        ['2026-11-22', puzzle(4)],
        ['2026-11-22/bonus', quiz(false)],
      ],
      '2026-11-23',
      recorded,
    );
    expect(changed.problems).toEqual([
      expect.stringMatching(/^puzzles\/2026-11-22\.json changed after it went live/),
      expect.stringMatching(/^bonus\/2026-11-22\.json changed after it went live/),
    ]);
  });

  it('fails a live quiz that was deleted', () => {
    const gone = report([['2026-11-22', puzzle(5)]], '2026-11-23', recorded);
    expect(gone.problems).toEqual([
      expect.stringMatching(/^bonus\/2026-11-22\.json was removed after it went live/),
    ]);
  });

  it('fails a quiz added after its day went live, and never records it', () => {
    const late = report(sunday, '2026-11-22', { '2026-11-22': recorded['2026-11-22'] }, true);
    expect(late.problems).toEqual([
      expect.stringMatching(/^bonus\/2026-11-22\.json was added after its day went live/),
    ]);
    expect(late.updated).toBeNull(); // nothing new to record: the late quiz stays out
  });

  it("warns about today's unrecorded files, and fails older ones (the job fell behind)", () => {
    const today = report(sunday, '2026-11-22', {});
    expect(today.problems).toEqual([]);
    expect(today.warnings).toEqual([expect.stringContaining('2026-11-22, 2026-11-22/bonus')]);
    const behind = report(sunday, '2026-11-23', {});
    expect(behind.problems).toEqual([expect.stringContaining(`commit ${FILE}`)]);
  });

  it('with --record, records a new day and its quiz together', () => {
    const recording = report(sunday, '2026-11-22', {}, true);
    expect(recording.problems).toEqual([]);
    expect(recording.recorded).toBe(2);
    expect(recording.updated).toEqual(recorded);
  });
});
