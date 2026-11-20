import { describe, expect, it } from 'vitest';
import { BONUS } from '@/config/bonus';
import { bonusFits, currentBonusIndex } from './bonus';
import { canOverwrite, canRestore, createRunState, gameReducer, runProgress } from './game';
import { PROMPT } from './matcher/testFixtures';
import { bonusLine, bonusMultiplier, dayTotal } from './scoring';
import type { BonusItem, BonusResult, Puzzle, RunState } from './types';

const item = (answer: boolean): BonusItem => ({ statement: 's', answer, explanation: 'e' });
const quizDay: Puzzle = {
  date: '2026-11-22',
  number: 17,
  prompts: [{ ...PROMPT, id: 'p1' }],
  bonus: [item(true), item(false), item(true)],
};
const plainDay: Puzzle = { ...quizDay, bonus: undefined } as unknown as Puzzle;
const answer = (correct: boolean): BonusResult => ({ answer: correct, correct, timeMs: 1 });

/** One prompt answered and its reveal done: on a quiz day, the quiz's intro. */
function atQuiz(puzzle: Puzzle = quizDay): RunState {
  const actions = [
    { type: 'start', roundEndsAt: 10 },
    {
      type: 'submit',
      promptId: 'p1',
      match: { level: 2, animalId: 'platypus', strategy: 'exact', input: 'x' },
      timeMs: 1,
    },
    { type: 'revealDone', nextRoundEndsAt: 20 },
  ] as const;
  return actions.reduce(gameReducer, createRunState(puzzle));
}

describe('bonus phase', () => {
  it('follows the last reveal on a quiz day, and not on a plain day', () => {
    expect(atQuiz()).toMatchObject({ status: 'bonus', bonusCount: 3, bonusEndsAt: null });
    expect(atQuiz(plainDay)).toMatchObject({ status: 'finished', bonusCount: 0 });
  });

  it('asks, records an answer, and finishes after the last explanation', () => {
    let state = gameReducer(atQuiz(), { type: 'bonusNext', endsAt: 100 });
    expect(state.bonusEndsAt).toBe(100);
    expect(currentBonusIndex(state)).toBe(0);
    state = gameReducer(state, { type: 'bonusAnswer', answer: true, correct: true, timeMs: 1 });
    expect(state).toMatchObject({ bonusEndsAt: null, bonusResults: [answer(true)] });
    expect(currentBonusIndex(state)).toBe(0); // its explanation shows
    for (const correct of [false, true]) {
      state = gameReducer(state, { type: 'bonusNext', endsAt: 200 });
      state = gameReducer(state, { type: 'bonusAnswer', answer: correct, correct, timeMs: 1 });
    }
    state = gameReducer(state, { type: 'bonusNext', endsAt: 300 });
    expect(state.status).toBe('finished');
    expect(dayTotal(state.results, state.bonusResults)).toBe(Math.round(25 * 1.2));
  });

  it('ignores bonus actions that do not fit, and leaves the normal flow alone', () => {
    const quiz = atQuiz();
    expect(gameReducer(quiz, { type: 'bonusAnswer', answer: true, correct: true, timeMs: 1 })).toBe(
      quiz,
    );
    const asked = gameReducer(quiz, { type: 'bonusNext', endsAt: 1 });
    expect(gameReducer(asked, { type: 'bonusNext', endsAt: 2 })).toBe(asked);
    const idle = createRunState(quizDay);
    expect(gameReducer(idle, { type: 'bonusNext', endsAt: 1 })).toBe(idle);
  });
});

describe('restoring and overwriting with a bonus', () => {
  const asked = gameReducer(atQuiz(), { type: 'bonusNext', endsAt: 100 });
  const answered = gameReducer(asked, {
    type: 'bonusAnswer',
    answer: false,
    correct: false,
    timeMs: 2,
  });

  it('restores a run in the quiz only on a day with the same quiz', () => {
    expect(canRestore(asked, quizDay, 'daily')).toBe(true);
    expect(canRestore(answered, quizDay, 'daily')).toBe(true);
    expect(canRestore(asked, { ...quizDay, bonus: [item(true)] }, 'daily')).toBe(false);
  });

  it('checks that the bonus fields fit the status', () => {
    expect(bonusFits({ ...asked, status: 'finished' }, 3)).toBe(false); // open question
    expect(bonusFits({ ...answered, status: 'finished', bonusEndsAt: null }, 3)).toBe(false); // 1 of 3
    expect(bonusFits({ ...answered, status: 'playing' }, 3)).toBe(false);
  });

  it('moves forward through the quiz, and never lets a second tab change an answer', () => {
    expect(runProgress(asked)).toBeGreaterThan(runProgress(atQuiz()));
    expect(runProgress(answered)).toBeGreaterThan(runProgress(asked));
    expect(canOverwrite(asked, answered)).toBe(true);
    expect(canOverwrite(answered, asked)).toBe(false);
    const retried = { ...answered, bonusResults: [answer(true)] };
    expect(canOverwrite(answered, retried)).toBe(false);
  });
});

describe('bonus scoring', () => {
  it(`adds ${BONUS.step} per right answer, up to ×${BONUS.maxMultiplier}`, () => {
    expect(bonusMultiplier([])).toBe(1);
    expect(bonusMultiplier([answer(true), answer(false), answer(true)])).toBe(1.2);
    expect(bonusMultiplier(Array.from({ length: 5 }, () => answer(true)))).toBe(
      BONUS.maxMultiplier,
    );
  });

  it('writes the line results and the share text show', () => {
    expect(bonusLine(540, 1.2, 648)).toBe('Base 540 ×1.2 = 648');
    expect(bonusLine(540, 1, 540)).toBe('Base 540 ×1.0 = 540');
  });
});
