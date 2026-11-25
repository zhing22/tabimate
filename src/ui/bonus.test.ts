// @vitest-environment jsdom
// v2 Step 11: the Sunday bonus quiz, played through the app.
import { describe, expect, it, vi } from 'vitest';
import { INSTANT_REVEAL } from '@/config/game';
import { emptyCollection } from '@/core/collection';
import { createBus, type GameEvents } from '@/core/events';
import { createGameController } from '@/core/gameController';
import { ANIMALS, PROMPT } from '@/core/matcher/testFixtures';
import { emptyStats } from '@/core/streak';
import { createFakeTime } from '@/core/testFakes';
import type { Puzzle } from '@/core/types';
import { createApp } from './app';
import { createScreenHost } from './host';
import { manualTime, pressEnter, type } from './testUi';

const puzzle: Puzzle = {
  date: '2026-11-22',
  number: 17,
  prompts: [{ ...PROMPT, id: 'p1', text: 'Prompt 1' }],
  bonus: [
    { statement: 'Bats are blind.', answer: false, explanation: 'Most bats see well.' },
    {
      statement: 'An octopus has three hearts.',
      answer: true,
      explanation: 'Two serve the gills.',
    },
    { statement: 'Koalas are bears.', answer: false, explanation: 'They are marsupials.' },
  ],
};

function setup() {
  document.body.innerHTML = '<main id="ui"></main>';
  const root = document.querySelector<HTMLElement>('#ui')!;
  const time = createFakeTime();
  const ui = manualTime(time.nowMs());
  const bus = createBus<GameEvents>();
  const deps = { puzzle, animals: ANIMALS, bus, clock: time.clock, scheduler: time.scheduler };
  const controller = createGameController(deps);
  const app = createApp({
    host: createScreenHost(root),
    bus,
    controller,
    puzzle,
    animals: ANIMALS,
    clock: time.clock,
    getStats: emptyStats,
    getCollection: emptyCollection,
    getStreakStatus: () => ({ streak: 0, savedByFreeze: false }),
    reload: () => {},
    share: () => Promise.resolve('copied'),
    revealTiming: INSTANT_REVEAL,
    frames: ui.frames,
    delay: ui.delay,
  });
  bus.on('runFinished', (totals) => app.showResults({ ...totals, stats: emptyStats() }));
  const $ = (selector: string) => root.querySelector<HTMLElement>(selector);
  const click = (text: string) =>
    [...root.querySelectorAll<HTMLButtonElement>('button')]
      .find((b) => b.textContent === text)!
      .click();
  return { root, time, app, $, click };
}

describe('the bonus quiz in the app', () => {
  it('follows the last prompt, asks three questions, then shows the multiplied total', async () => {
    const t = setup();
    t.app.showStart();
    t.click('Play');
    const input = t.$('#answer') as HTMLInputElement;
    type(input, 'Tiger'); // EN: 85 points
    pressEnter(input);
    t.click('Bonus quiz'); // the last reveal leads to the quiz, not the results
    expect(t.$('h1')?.textContent).toBe('Bonus quiz');
    t.click('Start');
    expect(t.$('.bonus__statement')?.textContent).toBe('Bats are blind.');
    expect(document.activeElement?.textContent).toBe('True');
    t.click('False'); // right
    expect(t.$('.bonus__verdict')?.textContent).toBe('Right!');
    expect(t.$('.bonus__explanation')?.textContent).toBe('Most bats see well.');
    t.click('Next question');
    t.click('False'); // wrong
    expect(t.$('.bonus__verdict')?.textContent).toBe("Not quite: it's true.");
    t.click('Next question');
    t.click('False'); // right
    t.click('See results');
    await vi.dynamicImportSettled(); // the results load when the run ends
    expect(t.$('.results__number')?.textContent).toBe(String(Math.round(85 * 1.2)));
    expect(t.$('.results__bonus')?.textContent).toBe('Base 85 ×1.2 = 102');
  });
});
