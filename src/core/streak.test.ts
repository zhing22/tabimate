import { describe, expect, it } from 'vitest';
import { STREAK_FREEZE } from '@/config/collection';
import { shiftKey } from './date';
import { createRunState, gameReducer, type GameAction } from './game';
import {
  currentStreak,
  emptyStats,
  historyEntry,
  recordRun,
  streakStatus,
  type HistoryEntry,
  type Stats,
} from './streak';
import type { MatchResult, Puzzle } from './types';

const day = (key: string, score = 10): HistoryEntry => ({ key, score, base: score, levels: [1] });
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
  it('records the date, score and each round level', () => {
    const puzzle: Puzzle = {
      date: '2026-11-07',
      number: 2,
      prompts: ['a', 'b'].map((id) => ({ id, text: id, answers: [] })),
    };
    const hit: MatchResult = { level: 3, animalId: 'x', strategy: 'exact', input: 'x' };
    const actions: GameAction[] = [
      { type: 'start', roundEndsAt: 1 },
      { type: 'submit', promptId: 'a', match: hit, timeMs: 1 },
      { type: 'revealDone', nextRoundEndsAt: 2 },
      { type: 'timeout', promptId: 'b', timeMs: 25_000 },
      { type: 'revealDone', nextRoundEndsAt: 3 },
    ];
    const finished = actions.reduce(gameReducer, createRunState(puzzle));
    expect(historyEntry(finished)).toEqual({
      key: '2026-11-07',
      score: 50,
      base: 50,
      levels: [3, 0],
      animalIds: ['x', null],
    });
  });
});

describe('streak freezes', () => {
  // 2026-11-01 .. 2026-11-07: a 7-day streak, which earns one freeze.
  const week = Array.from({ length: 7 }, (_, i) => `2026-11-0${i + 1}`);
  const { earnEvery, maxHeld } = STREAK_FREEZE;

  it(`earns one freeze per ${earnEvery}-day streak, holding at most ${maxHeld}`, () => {
    expect(play(...week.slice(0, -1)).freezes).toBe(0);
    expect(play(...week).freezes).toBe(1);
    const fortnight = Array.from({ length: 2 * earnEvery }, (_, i) => shiftKey('2026-11-01', i));
    expect(play(...fortnight).freezes).toBe(maxHeld); // a second week earns no second one
  });

  it('spends the freeze on a single missed day and keeps the streak going', () => {
    const stats = play(...week, '2026-11-09'); // 8 Nov missed
    expect(stats).toMatchObject({ streak: 8, freezes: 0, frozenKeys: ['2026-11-08'] });
  });

  it('cannot cover two missed days, and keeps the freeze for later', () => {
    const stats = play(...week, '2026-11-10');
    expect(stats).toMatchObject({ streak: 1, freezes: 1, frozenKeys: [] });
  });

  it('without a freeze, one missed day still resets the streak', () => {
    expect(play('2026-11-01', '2026-11-03')).toMatchObject({ streak: 1, frozenKeys: [] });
  });
});

describe('streakStatus', () => {
  const held = { ...emptyStats(), streak: 7, lastPlayedKey: '2026-11-07', freezes: 1 };

  it('keeps the streak alive today and the day after', () => {
    expect(streakStatus(held, '2026-11-07')).toEqual({ streak: 7, savedByFreeze: false });
    expect(streakStatus(held, '2026-11-08')).toEqual({ streak: 7, savedByFreeze: false });
  });

  it('says a freeze is saving it after one missed day, and loses it after two', () => {
    expect(streakStatus(held, '2026-11-09')).toEqual({ streak: 7, savedByFreeze: true });
    expect(streakStatus(held, '2026-11-10')).toEqual({ streak: 0, savedByFreeze: false });
    expect(streakStatus({ ...held, freezes: 0 }, '2026-11-09').streak).toBe(0);
  });
});
