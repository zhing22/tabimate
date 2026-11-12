// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ROUND_TIME_MS } from '@/config/game';
import { createBus, type GameEvents } from '@/core/events';
import { createGameController } from '@/core/gameController';
import { ANIMALS, PROMPT } from '@/core/matcher/testFixtures';
import { emptyStats } from '@/core/streak';
import { createFakeTime } from '@/core/testFakes';
import type { Puzzle, RunState } from '@/core/types';
import { createApp } from './app';
import { createScreenHost } from './host';
import { manualTime, pressEnter, pressKey, type } from './testUi';

const puzzle: Puzzle = {
  date: '2026-11-07',
  number: 2,
  prompts: ['r1', 'r2', 'r3'].map((id, i) => ({ ...PROMPT, id, text: `Prompt ${i + 1}` })),
};

function setup(suspenseMs = 0) {
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
    suspenseMs,
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

/** Answers, then presses Enter again to move on from the reveal. */
function answer(t: ReturnType<typeof setup>, text: string) {
  type(t.input(), text);
  pressEnter(t.input());
  pressKey(t.input(), 'Enter');
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

    // The reveal waits for the player, however long they take.
    t.time.advance(ROUND_TIME_MS * 2);
    expect(t.$('.reveal')).not.toBeNull();
    expect(t.$('.reveal__next')?.textContent).toBe('Next prompt');
    pressKey(input, 'Enter');
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
    t.time.advance(10_000); // well past the old deadline
    t.ui.set(0);
    expect(ring()).toBe('3'); // not run down to 0, which would look like a timeout
    t.$<HTMLButtonElement>('.reveal__next')!.click();
    t.ui.set(0);
    expect(t.$('#round-prompt')?.textContent).toBe('Prompt 2');
    expect(ring()).toBe(String(ROUND_TIME_MS / 1000));
  });

  it('ignores Enter while the drum-roll is still going', () => {
    vi.useFakeTimers();
    try {
      const t = setup(600);
      t.controller.start();
      type(t.input(), 'tiger');
      pressEnter(t.input());
      pressKey(t.input(), 'Enter'); // a hurried second Enter
      vi.advanceTimersByTime(600);
      expect(t.$('.reveal__name')?.textContent).toBe('Tiger');
      pressKey(t.input(), 'Enter');
      expect(t.$('#round-prompt')?.textContent).toBe('Prompt 2');
    } finally {
      vi.useRealTimers();
    }
  });

  it('offers "See results" after the last prompt', () => {
    const t = setup();
    t.controller.start();
    answer(t, 'Platypus');
    answer(t, 'tiger');
    type(t.input(), 'orca');
    pressEnter(t.input());
    const button = t.$<HTMLButtonElement>('.reveal__next')!;
    expect(button.textContent).toBe('See results');
    // Tapping it must not steal focus from the answer box (the phone keyboard).
    expect(button.dispatchEvent(new MouseEvent('mousedown', { cancelable: true }))).toBe(false);
    button.click();
    expect(t.$('#results-title')).not.toBeNull();
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
    // No answer box on screen after a reload, so the button takes focus.
    const next = t.$<HTMLButtonElement>('.reveal__next')!;
    expect(document.activeElement).toBe(next);
    next.click();
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
    // The run took no fake time, so the next reset is 24 h away.
    t.time.advance(24 * 3_600_000 - 1_000);
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
