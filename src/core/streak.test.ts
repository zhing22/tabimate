import { describe, expect, it } from 'vitest';
import { createRunState, gameReducer, type GameAction } from './game';
import {
  currentStreak,
  emptyStats,
  historyEntry,
  recordRun,
  type HistoryEntry,
  type Stats,
} from './streak';
import type { MatchResult, Puzzle } from './types';

const day = (key: string, score = 10): HistoryEntry => ({ key, score, tiers: [1] });
const play = (...keys: string[]): Stats =>
  keys.reduce((s, k) => recordRun(s, day(k)), emptyStats());

describe('recordRun', () => {
  it('starts a streak of 1 on the first day', () => {
    expect(play('2026-11-07')).toMatchObject({
      streak: 1,
      bestStreak: 1,
      lastPlayedKey: '2026-11-07',
    });
  });

  it('adds 1 when the last day played was yesterday', () => {
    expect(play('2026-11-07', '2026-11-08', '2026-11-09').streak).toBe(3);
  });

  it('carries the streak across month and year ends', () => {
    expect(play('2026-11-30', '2026-12-01').streak).toBe(2);
    expect(play('2026-12-31', '2027-01-01').streak).toBe(2);
  });

  it('resets to 1 after a missed day, keeping the best streak', () => {
    const stats = play('2026-11-07', '2026-11-08', '2026-11-09', '2026-11-11');
    expect(stats.streak).toBe(1);
    expect(stats.bestStreak).toBe(3);
  });

  it('ignores a day already recorded, so a repeated finish never counts twice', () => {
    const once = play('2026-11-07');
    expect(recordRun(once, day('2026-11-07', 999))).toBe(once);
  });

  it('files an older day in history without touching the streak', () => {
    const stats = recordRun(play('2026-11-09', '2026-11-10'), day('2026-11-01'));
    expect(stats.streak).toBe(2);
    expect(stats.lastPlayedKey).toBe('2026-11-10');
    expect(stats.history.map((h) => h.key)).toEqual(['2026-11-01', '2026-11-09', '2026-11-10']);
  });
});

describe('currentStreak', () => {
  const stats = play('2026-11-07', '2026-11-08');
  it.each([
    ['2026-11-08', 2, 'played today'],
    ['2026-11-09', 2, "today's puzzle can still extend it"],
    ['2026-11-10', 0, 'a day was missed'],
  ])('on %s it is %i (%s)', (today, streak) => {
    expect(currentStreak(stats, today)).toBe(streak);
  });

  it('is 0 before any play', () => {
    expect(currentStreak(emptyStats(), '2026-11-08')).toBe(0);
  });
});

describe('historyEntry', () => {
  it('records the date, score and each round tier', () => {
    const puzzle: Puzzle = {
      date: '2026-11-07',
      number: 2,
      prompts: ['a', 'b'].map((id) => ({ id, text: id, answers: [] })),
    };
    const hit: MatchResult = { tier: 3, animalId: 'x', strategy: 'exact', input: 'x' };
    const actions: GameAction[] = [
      { type: 'start', roundEndsAt: 1 },
      { type: 'submit', promptId: 'a', match: hit, timeMs: 1 },
      { type: 'revealDone', nextRoundEndsAt: 2 },
      { type: 'timeout', promptId: 'b', timeMs: 25_000 },
      { type: 'revealDone', nextRoundEndsAt: 3 },
    ];
    const finished = actions.reduce(gameReducer, createRunState(puzzle));
    expect(historyEntry(finished)).toEqual({ key: '2026-11-07', score: 50, tiers: [3, 0] });
  });
});
