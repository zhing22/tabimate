import { describe, expect, it } from 'vitest';
import {
  canRestore,
  createRunState,
  currentRoundIndex,
  gameReducer,
  type GameAction,
} from './game';
import type { MatchResult, Puzzle, RunState, RunStatus } from './types';

const puzzle: Puzzle = {
  date: '2026-11-07',
  number: 2,
  prompts: ['a', 'b', 'c'].map((id) => ({ id, text: id, answers: [{ animalId: 'x', tier: 1 }] })),
};
const hit: MatchResult = { tier: 1, animalId: 'x', strategy: 'exact', input: 'x' };
const submit = (promptId: string): GameAction => ({
  type: 'submit',
  promptId,
  match: hit,
  timeMs: 5,
});

const idle = createRunState(puzzle);
const run = (...actions: GameAction[]) => actions.reduce(gameReducer, idle);
const playing0 = run({ type: 'start', roundEndsAt: 1000 });
const revealing0 = run({ type: 'start', roundEndsAt: 1000 }, submit('a'));
const finished = run(
  { type: 'start', roundEndsAt: 1000 },
  submit('a'),
  { type: 'revealDone', nextRoundEndsAt: 2000 },
  submit('b'),
  { type: 'revealDone', nextRoundEndsAt: 2000 },
  submit('c'),
  { type: 'revealDone', nextRoundEndsAt: 2000 },
);

describe('createRunState', () => {
  it('starts idle with no results, and keeps mode, date and prompt count', () => {
    expect(idle).toEqual({
      mode: 'daily',
      puzzleDate: '2026-11-07',
      promptCount: 3,
      results: [],
      status: 'idle',
      roundEndsAt: null,
    });
  });
});

describe('gameReducer: round deadline', () => {
  it('is set while playing and cleared otherwise', () => {
    expect(playing0.roundEndsAt).toBe(1000);
    expect(revealing0.roundEndsAt).toBeNull();
    const next = gameReducer(revealing0, { type: 'revealDone', nextRoundEndsAt: 2000 });
    expect(next.roundEndsAt).toBe(2000);
    expect(finished.roundEndsAt).toBeNull();
  });
});

describe('gameReducer: legal transitions', () => {
  it('start: idle -> playing', () => {
    expect(playing0.status).toBe('playing');
  });

  it('submit: playing -> revealing, recording the result', () => {
    expect(revealing0.status).toBe('revealing');
    expect(revealing0.results).toEqual([{ promptId: 'a', match: hit, timeMs: 5 }]);
  });

  it('timeout: playing -> revealing with an empty miss', () => {
    const state = gameReducer(playing0, { type: 'timeout', promptId: 'a', timeMs: 25_000 });
    expect(state.status).toBe('revealing');
    expect(state.results[0]).toEqual({
      promptId: 'a',
      timeMs: 25_000,
      match: { tier: 0, animalId: null, strategy: null, input: '' },
    });
  });

  it('revealDone: revealing -> playing, or finished after the last prompt', () => {
    expect(gameReducer(revealing0, { type: 'revealDone', nextRoundEndsAt: 2000 }).status).toBe(
      'playing',
    );
    expect(finished.status).toBe('finished');
    expect(finished.results.map((r) => r.promptId)).toEqual(['a', 'b', 'c']);
  });

  it('restore: idle -> the saved state', () => {
    expect(gameReducer(idle, { type: 'restore', state: revealing0 })).toBe(revealing0);
  });

  it('never mutates the state it is given', () => {
    const before = structuredClone(playing0);
    gameReducer(playing0, submit('a'));
    expect(playing0).toEqual(before);
  });
});

describe('gameReducer: illegal transitions return the same state', () => {
  const states: Record<RunStatus, RunState> = {
    idle,
    playing: playing0,
    revealing: revealing0,
    finished,
  };
  const actions: Record<string, GameAction> = {
    start: { type: 'start', roundEndsAt: 1000 },
    submit: submit('a'),
    timeout: { type: 'timeout', promptId: 'a', timeMs: 1 },
    revealDone: { type: 'revealDone', nextRoundEndsAt: 2000 },
    restore: { type: 'restore', state: playing0 },
  };
  const legal = new Set([
    'idle:start',
    'idle:restore',
    'playing:submit',
    'playing:timeout',
    'revealing:revealDone',
  ]);
  const illegal = Object.keys(states).flatMap((status) =>
    Object.keys(actions)
      .filter((action) => !legal.has(`${status}:${action}`))
      .map((action) => [status as RunStatus, action] as const),
  );

  it.each(illegal)('%s + %s', (status, action) => {
    const state = states[status];
    expect(gameReducer(state, actions[action]!)).toBe(state);
  });

  it('rejects an answer once every prompt has one', () => {
    const full: RunState = { ...finished, status: 'playing' };
    expect(gameReducer(full, submit('d'))).toBe(full);
  });
});

describe('currentRoundIndex', () => {
  it('is derived from results and status', () => {
    expect(currentRoundIndex(idle)).toBeNull();
    expect(currentRoundIndex(playing0)).toBe(0);
    expect(currentRoundIndex(revealing0)).toBe(0);
    expect(
      currentRoundIndex(gameReducer(revealing0, { type: 'revealDone', nextRoundEndsAt: 2000 })),
    ).toBe(1);
    expect(currentRoundIndex(finished)).toBeNull();
  });
});

describe('canRestore', () => {
  it.each<[string, RunState]>([
    ['idle', idle],
    ['playing', playing0],
    ['revealing', revealing0],
    ['finished', finished],
  ])('accepts a consistent %s run', (_name, state) => {
    expect(canRestore(state, puzzle, 'daily')).toBe(true);
  });

  it.each<[string, RunState]>([
    ['another day', { ...playing0, puzzleDate: '2026-11-08' }],
    ['another prompt count', { ...playing0, promptCount: 7 }],
    [
      'results out of order',
      { ...revealing0, results: [{ ...revealing0.results[0]!, promptId: 'b' }] },
    ],
    ['finished too early', { ...revealing0, status: 'finished' }],
    ['playing with every prompt answered', { ...finished, status: 'playing' }],
    ['revealing with no result', { ...playing0, status: 'revealing' }],
    ['idle with results', { ...revealing0, status: 'idle' }],
    ['too many results', { ...finished, results: [...finished.results, finished.results[0]!] }],
    ['playing without a deadline', { ...playing0, roundEndsAt: null }],
    ['playing with a bad deadline', { ...playing0, roundEndsAt: Number.NaN }],
    ['revealing with a deadline', { ...revealing0, roundEndsAt: 5000 }],
  ])('rejects %s', (_name, state) => {
    expect(canRestore(state, puzzle, 'daily')).toBe(false);
  });
});
