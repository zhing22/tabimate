// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { REVEAL_DELAY_MS, ROUND_TIME_MS } from '@/config/game';
import { createBus, type GameEvents } from '@/core/events';
import { createGameController } from '@/core/gameController';
import { ANIMALS, PROMPT } from '@/core/matcher/testFixtures';
import { emptyStats } from '@/core/streak';
import { createFakeTime } from '@/core/testFakes';
import type { Puzzle, RunState } from '@/core/types';
import { createApp } from './app';
import { createScreenHost } from './host';
import { pressEnter, type, manualTime } from './testUi';

const puzzle: Puzzle = {
  date: '2026-11-07',
  number: 2,
  prompts: ['r1', 'r2', 'r3'].map((id, i) => ({ ...PROMPT, id, text: `Prompt ${i + 1}` })),
};

function setup() {
  document.body.innerHTML = '<main id="ui"></main>';
  const root = document.querySelector<HTMLElement>('#ui')!;
  const time = createFakeTime();
  const ui = manualTime();
  const bus = createBus<GameEvents>();
  const controller = createGameController({
    puzzle,
    animals: ANIMALS,
    bus,
    clock: time.clock,
    scheduler: time.scheduler,
  });
  const reload = vi.fn();
  // Stands in for progress: 2-day streak until today's run is recorded.
  let stats = { ...emptyStats(), streak: 2, bestStreak: 4 };
  const getStats = () => stats;
  const app = createApp({
    host: createScreenHost(root),
    bus,
    controller,
    puzzle,
    animals: ANIMALS,
    clock: time.clock,
    getStats,
    reload,
    suspenseMs: 0,
    frames: ui.frames,
    interval: ui.interval,
  });
  // As main.ts does: record the run, then show results.
  bus.on('runFinished', ({ results, score }) => {
    stats = { ...stats, streak: 3 };
    app.showResults({ results, score, stats: getStats() });
  });
  const $ = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector);
  const input = () => $<HTMLInputElement>('#answer')!;
  const live = () => $('[aria-live]')!.textContent;
  const flush = () => Promise.resolve(); // let the live region's microtask run
  return { root, time, ui, controller, app, reload, $, input, live, flush };
}

/** Answers and waits out the reveal. */
function answer(t: ReturnType<typeof setup>, text: string) {
  type(t.input(), text);
  pressEnter(t.input());
  t.time.advance(REVEAL_DELAY_MS);
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('app: playing with the keyboard', () => {
  it('start -> three rounds -> results, with focus where the player needs it', async () => {
    const t = setup();
    t.app.showStart();
    expect(t.$('h1')?.textContent).toBe('Tabimate');
    expect(t.$('.meta')?.textContent).toContain('Puzzle #2');
    expect(document.activeElement?.textContent).toBe('Play');

    (document.activeElement as HTMLButtonElement).click();
    const input = t.input();
    expect(document.activeElement).toBe(input);
    expect(t.$('#round-prompt')?.textContent).toBe('Prompt 1');
    expect(t.$('label[for="answer"]')).not.toBeNull();

    type(input, 'Platypus');
    pressEnter(input);
    // The reveal sits over the round; the same input keeps focus (keyboard stays up).
    expect(t.$('.reveal .reveal__name')?.textContent).toBe('Platypus');
    expect(t.$('.reveal .tier-badge')?.textContent).toBe('NT · Near Threatened');
    expect(document.activeElement).toBe(input);
    expect(input.readOnly).toBe(true);
    await t.flush();
    expect(t.live()).toBe('Platypus: Near Threatened, 25 points.');

    t.time.advance(REVEAL_DELAY_MS);
    expect(t.$('.reveal')).toBeNull();
    expect(t.input()).toBe(input); // the very same element, round after round
    expect(input.value).toBe('');
    expect(input.readOnly).toBe(false);
    expect(t.$('#round-prompt')?.textContent).toBe('Prompt 2');
    expect(t.$('.round__step')?.textContent).toBe('Prompt 2 of 3');

    answer(t, 'snow leopard');
    answer(t, 'tiger');
    expect(t.$('#results-title')?.textContent).toBe('Journey complete');
    expect(document.activeElement).toBe(t.$('#results-title'));
    expect(t.$('.results__number')?.textContent).toBe('160');
    expect(t.root.textContent).toContain('Reached the Forest');
    // The streak includes the run just finished.
    expect(t.root.textContent).toContain('3-day streak');
    expect(t.root.querySelectorAll('.team-card__member')).toHaveLength(3);
  });

  it('ignores Enter on an empty box', () => {
    const t = setup();
    t.app.showStart();
    t.controller.start();
    type(t.input(), '   ');
    pressEnter(t.input());
    expect(t.$('.reveal')).toBeNull();
    expect(t.$<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
  });

  it('shows a timeout as "Time\'s up"', async () => {
    const t = setup();
    t.controller.start();
    t.time.advance(ROUND_TIME_MS);
    expect(t.$('.reveal__name')?.textContent).toBe("Time's up");
    await t.flush();
    expect(t.live()).toBe("Time's up. No match.");
  });

  it('announces a new biome', async () => {
    const t = setup();
    t.controller.start();
    answer(t, 'snow leopard'); // 50 points: Grassland
    await t.flush();
    expect(t.live()).toBe('You entered the Grassland.');
  });

  it('holds the timer during the reveal, then restarts it for the next prompt', () => {
    const t = setup();
    t.controller.start();
    const ring = () => t.$('.timer-ring__label')?.textContent;
    t.time.advance(ROUND_TIME_MS - 3_000);
    t.ui.set(0);
    expect(ring()).toBe('3');
    type(t.input(), 'tiger');
    pressEnter(t.input());
    t.time.advance(REVEAL_DELAY_MS - 1); // well past the old deadline
    t.ui.set(0);
    expect(ring()).toBe('3'); // not run down to 0, which would look like a timeout
    t.time.advance(1);
    t.ui.set(0);
    expect(t.$('#round-prompt')?.textContent).toBe('Prompt 2');
    expect(ring()).toBe(String(ROUND_TIME_MS / 1000));
  });

  it('shows text the player typed as text, never as markup', () => {
    const t = setup();
    t.controller.start();
    type(t.input(), '<img src=x onerror=alert(1)>');
    pressEnter(t.input());
    expect(t.root.querySelector('img')).toBeNull();
  });
});

describe('app: restoring a saved run', () => {
  function savedRun(steps: (t: ReturnType<typeof setup>) => void): RunState {
    const first = setup();
    first.controller.start();
    steps(first);
    return first.controller.getState();
  }

  it('picks up mid-reveal with the reveal showing', () => {
    const saved = savedRun((t) => {
      type(t.input(), 'tiger');
      pressEnter(t.input());
    });
    const t = setup();
    expect(t.controller.restore(saved)).toBe(true);
    expect(t.$('.reveal__name')?.textContent).toBe('Tiger');
    t.time.advance(REVEAL_DELAY_MS);
    expect(t.$('#round-prompt')?.textContent).toBe('Prompt 2');
  });

  it('opens a finished day on the results', () => {
    const saved = savedRun((t) => {
      for (const text of ['Platypus', 'tiger', 'orca']) answer(t, text);
    });
    const t = setup();
    t.controller.restore(saved);
    expect(t.$('#results-title')).not.toBeNull();
  });
});

describe('app: next puzzle', () => {
  it('counts down to the next noon and then offers the new puzzle', () => {
    const t = setup();
    t.controller.start();
    for (const text of ['Platypus', 'tiger', 'orca']) answer(t, text);
    const button = [...t.root.querySelectorAll('button')].find((b) =>
      b.textContent?.includes("today's puzzle"),
    )!;
    expect(button.hidden).toBe(true);
    // The fake run took 3 reveals; the next reset is just under 24 h away.
    t.time.advance(24 * 3_600_000 - 3 * REVEAL_DELAY_MS - 1_000);
    t.ui.set(0);
    expect(t.$('.countdown')?.textContent).toBe('00:00:01');
    t.time.advance(1_000);
    t.ui.set(0);
    expect(t.$('.countdown')?.textContent).toBe('00:00:00');
    expect(button.hidden).toBe(false);
    button.click();
    expect(t.reload).toHaveBeenCalledTimes(1);
  });
});
