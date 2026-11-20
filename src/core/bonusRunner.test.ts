import { describe, expect, it } from 'vitest';
import { BONUS } from '@/config/bonus';
import { createBus, type GameEvents } from './events';
import { createGameController } from './gameController';
import { ANIMALS, PROMPT } from './matcher/testFixtures';
import { createFakeTime } from './testFakes';
import type { BonusItem, Puzzle, RunState } from './types';

const item = (answer: boolean, statement: string): BonusItem => ({
  statement,
  answer,
  explanation: 'Because.',
});
// One prompt, then a three-question quiz: true, false, true.
const puzzle: Puzzle = {
  date: '2026-11-22',
  number: 17,
  prompts: [{ ...PROMPT, id: 'p1' }],
  bonus: [item(true, 'Q1'), item(false, 'Q2'), item(true, 'Q3')],
};

function setup() {
  const time = createFakeTime();
  const bus = createBus<GameEvents>();
  const story: string[] = [];
  bus.on('bonusIntro', ({ total }) => story.push(`intro ${total}`));
  bus.on('bonusQuestionStarted', ({ index, item: q }) => story.push(`ask ${index} ${q.statement}`));
  bus.on('bonusAnswered', ({ index, result }) =>
    story.push(`answered ${index} ${result.answer} ${result.correct ? 'right' : 'wrong'}`),
  );
  let finished: GameEvents['runFinished'] | null = null;
  bus.on('runFinished', (totals) => (finished = totals));
  const deps = { puzzle, animals: ANIMALS, bus, clock: time.clock, scheduler: time.scheduler };
  const game = createGameController(deps);
  /** Plays the prompt (Tiger, EN: 85 points) up to the quiz's intro. */
  const toQuiz = () => {
    game.start();
    game.submit('Tiger');
    game.next();
  };
  return { time, bus, deps, game, story, toQuiz, finished: () => finished };
}

describe('the bonus quiz', () => {
  it('runs after the last reveal: intro, three timed questions, then the multiplied total', () => {
    const t = setup();
    t.toQuiz();
    expect(t.finished()).toBeNull();
    t.game.next(); // Start
    t.game.answerBonus(true); // right
    t.game.next();
    t.game.answerBonus(true); // wrong: it was false
    t.game.next();
    t.game.answerBonus(true); // right
    t.game.next(); // See results
    expect(t.story).toEqual([
      'intro 3',
      'ask 0 Q1',
      'answered 0 true right',
      'ask 1 Q2',
      'answered 1 true wrong',
      'ask 2 Q3',
      'answered 2 true right',
    ]);
    expect(t.finished()).toMatchObject({ base: 85, multiplier: 1.2, score: 102 });
  });

  it(`counts a question left for ${BONUS.questionMs / 1000} s as wrong`, () => {
    const t = setup();
    t.toQuiz();
    t.game.next();
    t.time.advance(BONUS.questionMs);
    expect(t.story.at(-1)).toBe('answered 0 null wrong');
    t.game.answerBonus(true); // too late: the question is closed
    expect(t.game.getState().bonusResults).toHaveLength(1);
  });

  it('counts an answer tapped after the deadline as a timeout (a late background timer)', () => {
    const t = setup();
    t.toQuiz();
    t.game.next();
    // The tab was in the background: the clock passed the deadline, the timer hasn't fired.
    t.time.skip(BONUS.questionMs + 5_000);
    t.game.answerBonus(true); // the right answer, looked up elsewhere
    expect(t.story.at(-1)).toBe('answered 0 null wrong');
  });

  it('picks a reload back up mid-question with the time it had left', () => {
    const first = setup();
    first.toQuiz();
    first.game.next();
    first.time.advance(4_000);
    const saved: RunState = first.game.getState();
    const second = setup();
    second.time.advance(4_000);
    expect(second.game.restore(saved)).toBe(true);
    expect(second.story).toEqual(['ask 0 Q1']);
    second.time.advance(BONUS.questionMs - 4_000);
    expect(second.story.at(-1)).toBe('answered 0 null wrong');
  });

  it('shows the intro again after a reload before the first question', () => {
    const first = setup();
    first.toQuiz();
    const second = setup();
    expect(second.game.restore(first.game.getState())).toBe(true);
    expect(second.story).toEqual(['intro 3']);
  });
});
