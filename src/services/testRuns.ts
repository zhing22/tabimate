// Test-only runs for the services tests. Not imported by the app.
import { createRunState, gameReducer, type GameAction } from '@/core/game';
import type { DateKey, MatchResult, Puzzle, RunState } from '@/core/types';

export const PROMPT_IDS = ['r1', 'r2', 'r3'];

export const puzzleFor = (date: DateKey): Puzzle => ({
  date,
  number: 1,
  prompts: PROMPT_IDS.map((id) => ({
    id,
    text: id,
    answers: [{ animalId: 'platypus', tier: 2 }],
  })),
});

const hit: MatchResult = { tier: 2, animalId: 'platypus', strategy: 'exact', input: 'platypus' };

const runOf = (date: DateKey, actions: GameAction[]): RunState =>
  actions.reduce(gameReducer, createRunState(puzzleFor(date)));

/** One answer in, waiting on round 2. */
export const playingRun = (date: DateKey): RunState =>
  runOf(date, [
    { type: 'start', roundEndsAt: 1 },
    { type: 'submit', promptId: 'r1', match: hit, timeMs: 1 },
    { type: 'revealDone', nextRoundEndsAt: 2 },
  ]);

/** Tier 2, then two timeouts: 25 points. */
export const finishedRun = (date: DateKey): RunState =>
  runOf(date, [
    { type: 'start', roundEndsAt: 1 },
    { type: 'submit', promptId: 'r1', match: hit, timeMs: 1 },
    { type: 'revealDone', nextRoundEndsAt: 2 },
    { type: 'timeout', promptId: 'r2', timeMs: 25_000 },
    { type: 'revealDone', nextRoundEndsAt: 3 },
    { type: 'timeout', promptId: 'r3', timeMs: 25_000 },
    { type: 'revealDone', nextRoundEndsAt: 4 },
  ]);
