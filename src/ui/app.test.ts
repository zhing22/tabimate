// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  INSTANT_REVEAL,
  ROUND_START_GRACE_MS,
  ROUND_TIME_MS,
  type RevealTiming,
} from '@/config/game';
import { createBus, type GameEvents } from '@/core/events';
import { createGameController } from '@/core/gameController';
import { ANIMALS, PROMPT } from '@/core/matcher/testFixtures';
import { emptyCollection } from '@/core/collection';
import { emptyStats } from '@/core/streak';
import { createFakeTime } from '@/core/testFakes';
import type { Puzzle, RunState } from '@/core/types';
import { createApp, type FinishedRun } from './app';
import type { ShareOutcome } from '@/core/share';
import { PAGE_CLASS, TYPING_CLASS } from './layout/shell';
import { SAID_MS } from './screens/results';
import { createScreenHost } from './host';
import { manualTime, pressEnter, pressKey, type } from './testUi';

const puzzle: Puzzle = {
  date: '2026-11-07',
  number: 2,
  prompts: ['r1', 'r2', 'r3'].map((id, i) => ({ ...PROMPT, id, text: `Prompt ${i + 1}` })),
};

function setup(
  revealTiming: RevealTiming = INSTANT_REVEAL,
  layout: 'landscape' | 'portrait' = 'landscape',
) {
  document.body.innerHTML = '<main id="ui"></main>';
  // Most tests play with a keyboard beside the scene (landscape: the box keeps focus).
  document.documentElement.dataset['layout'] = layout;
  const root = document.querySelector<HTMLElement>('#ui')!;
  const time = createFakeTime();
  // UI time follows the game clock, so countdown delays fall due at the right moments.
  const ui = manualTime(time.nowMs());
  const bus = createBus<GameEvents>();
  const controller = createGameController({
    puzzle,
    animals: ANIMALS,
    bus,
    clock: time.clock,
    scheduler: time.scheduler,
  });
  const reload = vi.fn();
  const share = vi.fn<(run: FinishedRun) => Promise<ShareOutcome>>(() => Promise.resolve('copied'));
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
    getCollection: () => emptyCollection(),
    getStreakStatus: () => ({ streak: stats.streak, savedByFreeze: false }),
    reload,
    share,
    revealTiming,
    frames: ui.frames,
    delay: ui.delay,
  });
  // As main.ts does: record the run, then show results.
  bus.on('runFinished', (totals) => {
    stats = { ...stats, streak: 3 };
    app.showResults({ ...totals, stats: getStats() });
  });
  const $ = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector);
  const input = () => $<HTMLInputElement>('#answer')!;
  const live = () => $('[aria-live]')!.textContent;
  const flush = () => Promise.resolve(); // let the live region's microtask run
  return { root, time, ui, controller, app, reload, share, $, input, live, flush };
}

/** The results (and their summary) load on first use: wait for the import. */
const loaded = () => vi.dynamicImportSettled();

/** Answers, then presses Enter again to move on from the reveal. */
function answer(t: ReturnType<typeof setup>, text: string) {
  type(t.input(), text);
  pressEnter(t.input());
  pressKey(t.input(), 'Enter');
}

beforeEach(() => {
  document.body.innerHTML = '';
  document.documentElement.className = ''; // a results screen left mounted marks <html>
});

describe('app: playing with the keyboard', () => {
  it('start -> three rounds -> results, with focus where the player needs it', async () => {
    const t = setup();
    t.app.showStart();
    expect(t.$('h1 [role="img"]')?.getAttribute('aria-label')).toBe('Tabimate');
    expect(t.$('.theme-chip')?.textContent).toContain('Puzzle #2');
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
    expect(t.$('.reveal .level-badge')?.textContent).toBe('NT · Near Threatened');
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
    await loaded(); // the results load when the run ends
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
      const t = setup({ ...INSTANT_REVEAL, suspenseMs: 600 });
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

  it('offers "See results" after the last prompt', async () => {
    const t = setup();
    t.controller.start();
    answer(t, 'Platypus');
    answer(t, 'tiger');
    type(t.input(), 'killer whale');
    pressEnter(t.input());
    const button = t.$<HTMLButtonElement>('.reveal__next')!;
    expect(button.textContent).toBe('See results');
    // Tapping it must not steal focus from the answer box (the phone keyboard).
    expect(button.dispatchEvent(new MouseEvent('mousedown', { cancelable: true }))).toBe(false);
    button.click();
    await loaded(); // the results load when the run ends
    expect(t.$('#results-title')).not.toBeNull();
  });

  it('shows text the player typed as text, never as markup', () => {
    const t = setup();
    t.controller.start();
    type(t.input(), '<img src=x onerror=alert(1)>');
    pressEnter(t.input());
    t.time.advance(ROUND_TIME_MS); // submitted as it stands, then shown in the reveal
    expect(t.root.querySelector('img')).toBeNull();
  });
});

describe('app: a close guess', () => {
  it.each([
    ['platipus', 'Platypus'], // typo
    ['orca', 'Killer whale'], // another name
    ['snow leo', 'Snow leopard'], // part of the name
  ])('puts the right name in the box for %j, and Go then answers it', async (typed, name) => {
    const t = setup();
    t.controller.start();
    const input = t.input();
    type(input, typed);
    pressEnter(input);
    expect(t.$('.reveal')).toBeNull(); // not scored yet
    expect(input.value).toBe(name);
    const note = t.$('.answer__note')!;
    expect(note.hidden).toBe(false);
    expect(note.dataset['kind']).toBe('hint');
    expect(note.textContent).toBe('Did you mean this? Press Go to answer.');
    await t.flush();
    expect(t.live()).toBe(`${name}. Did you mean this? Press Go to answer.`);
    expect(input.getAttribute('aria-invalid')).toBe('false');
    // Selected, so typing something else replaces it.
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, name.length]);
    expect(document.activeElement).toBe(input);

    pressEnter(input);
    expect(t.$('.reveal__name')?.textContent).toBe(name);
  });

  it('scores the corrected name if time runs out before Go', () => {
    const t = setup();
    t.controller.start();
    type(t.input(), 'platipus');
    pressEnter(t.input());
    t.time.advance(ROUND_TIME_MS);
    expect(t.$('.reveal__name')?.textContent).toBe('Platypus');
  });

  it('scores 0 for a close guess never sent, when time runs out', () => {
    const t = setup();
    t.controller.start();
    type(t.input(), 'platipus');
    t.time.advance(ROUND_TIME_MS);
    expect(t.$('.reveal__points')?.textContent).toBe('+0');
  });
});

describe('app: a guess that matches nothing', () => {
  it('reads the message out, and again on a second miss in a row', async () => {
    const t = setup();
    t.controller.start();
    type(t.input(), 'James');
    pressEnter(t.input());
    await t.flush();
    expect(t.live()).toBe("Not on today's list. Try again.");
    pressEnter(t.input()); // the same guess again: the same message
    expect(t.live()).toBe(''); // cleared first, so it is a change a screen reader hears
    await t.flush();
    expect(t.live()).toBe("Not on today's list. Try again.");
  });

  it('says so in one line under the box, keeps the text and focus, and lets them retry', () => {
    const t = setup();
    t.controller.start();
    const input = t.input();
    type(input, 'James');
    pressEnter(input);
    const error = t.$('.answer__note')!;
    expect(error.hidden).toBe(false);
    expect(error.textContent).toBe("Not on today's list. Try again.");
    expect(input.getAttribute('aria-describedby')).toContain(error.id);
    expect(input.value).toBe('James');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(input);
    expect(t.$('.reveal')).toBeNull();

    type(input, 'tiger'); // editing hides the message
    expect(error.hidden).toBe(true);
    expect(input.getAttribute('aria-invalid')).toBe('false');
    pressEnter(input);
    expect(t.$('.reveal__name')?.textContent).toBe('Tiger');
  });

  it('submits what is in the box when time runs out, at 0 points if it still matches nothing', async () => {
    const t = setup();
    t.controller.start();
    type(t.input(), 'James');
    pressEnter(t.input());
    t.time.advance(ROUND_TIME_MS);
    expect(t.$('.reveal__name')?.textContent).toBe("Time's up");
    expect(t.$('.reveal__points')?.textContent).toBe('+0');
    await t.flush();
    expect(t.live()).toBe('Time\x27s up. No match for "James".');
  });

  it('scores a match typed but not sent before time ran out', () => {
    const t = setup();
    t.controller.start();
    type(t.input(), 'platypus');
    t.time.advance(ROUND_TIME_MS);
    expect(t.$('.reveal__name')?.textContent).toBe('Platypus');
    expect(t.$('.reveal__points')?.textContent).toBe('+25');
  });

  it('starts the next prompt with the message gone', () => {
    const t = setup();
    t.controller.start();
    type(t.input(), 'James');
    pressEnter(t.input());
    answer(t, 'tiger');
    expect(t.$('.answer__note')?.hidden).toBe(true);
    expect(t.input().value).toBe('');
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

  it('opens a finished day on the results', async () => {
    const saved = savedRun((t) => {
      for (const text of ['Platypus', 'tiger', 'killer whale']) answer(t, text);
    });
    const t = setup();
    t.controller.restore(saved);
    await loaded(); // the results load when the run ends
    expect(t.$('#results-title')).not.toBeNull();
  });
});

describe('app: next puzzle', () => {
  it('counts down to the next noon and then offers the new puzzle', async () => {
    const t = setup();
    t.controller.start();
    for (const text of ['Platypus', 'tiger', 'killer whale']) answer(t, text);
    await loaded(); // the results load when the run ends
    const button = [...t.root.querySelectorAll('button')].find((b) =>
      b.textContent?.includes("today's puzzle"),
    )!;
    expect(button.hidden).toBe(true);
    // The run took no fake time, so the next reset is 24 h away.
    t.time.advance(24 * 3_600_000 - 1_000);
    t.ui.set(t.time.nowMs());
    expect(t.$('.countdown')?.textContent).toBe('00:00:01');
    t.time.advance(1_000);
    t.ui.set(t.time.nowMs());
    expect(t.$('.countdown')?.textContent).toBe('00:00:00');
    expect(button.hidden).toBe(false);
    button.click();
    expect(t.reload).toHaveBeenCalledTimes(1);
  });
});

describe('app: sharing', () => {
  it('shares the finished run and says it was copied', async () => {
    const t = setup();
    t.controller.start();
    for (const text of ['Platypus', 'tiger', 'killer whale']) answer(t, text);
    await loaded(); // the results load when the run ends
    const button = [...t.root.querySelectorAll('button')].find((b) => b.textContent === 'Share')!;
    button.click();
    await t.flush();
    await t.flush();
    expect(t.share).toHaveBeenCalledTimes(1);
    expect(t.share.mock.calls[0]![0]).toMatchObject({ score: 25 + 85 + 10 });
    expect(t.share.mock.calls[0]![0].results.map((r) => r.match.animalId)).toEqual([
      'platypus',
      'tiger',
      'killer-whale',
    ]);
    expect(button.textContent).toBe('Copied!');
    expect(t.$('[role="status"]')?.textContent).toBe('Copied!');
  });

  it('says nothing when the share sheet is dismissed', async () => {
    const t = setup();
    t.share.mockResolvedValueOnce('cancelled');
    t.controller.start();
    for (const text of ['Platypus', 'tiger', 'killer whale']) answer(t, text);
    await loaded(); // the results load when the run ends
    const button = [...t.root.querySelectorAll('button')].find((b) => b.textContent === 'Share')!;
    button.click();
    await t.flush();
    await t.flush();
    expect(button.textContent).toBe('Share');
    expect(t.$('[role="status"]')?.textContent).toBe('');
  });

  it('opens straight on the results, ready to share, when today is already done', async () => {
    const first = setup();
    first.controller.start();
    for (const text of ['Platypus', 'tiger', 'killer whale']) answer(first, text);
    const t = setup();
    t.controller.restore(first.controller.getState());
    await loaded(); // the results load when the run ends
    expect(t.$('#results-title')).not.toBeNull();
    expect([...t.root.querySelectorAll('button')].some((b) => b.textContent === 'Share')).toBe(
      true,
    );
  });
});

describe('app: the Share button', () => {
  const finish = async (t: ReturnType<typeof setup>) => {
    t.controller.start();
    for (const text of ['Platypus', 'tiger', 'killer whale']) answer(t, text);
    await loaded(); // the results load when the run ends
    return [...t.root.querySelectorAll('button')].find((b) => b.textContent === 'Share')!;
  };
  const settle = async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  };

  it('ignores taps while a share is still going', async () => {
    const t = setup();
    let done: (outcome: 'shared') => void = () => {};
    t.share.mockImplementationOnce(() => new Promise((resolve) => (done = resolve)));
    const button = await finish(t);
    button.click();
    button.click(); // the sheet is still open
    expect(t.share).toHaveBeenCalledTimes(1);
    done('shared');
    await settle();
    expect(button.textContent).toBe('Shared!');
    button.click();
    expect(t.share).toHaveBeenCalledTimes(2);
  });

  it(`reads "Share" again ${SAID_MS} ms after saying how it went`, async () => {
    const t = setup();
    const button = await finish(t);
    button.click();
    await settle();
    expect(button.textContent).toBe('Copied!');
    const start = t.ui.now();
    t.ui.set(start + SAID_MS - 1);
    expect(button.textContent).toBe('Copied!');
    t.ui.set(start + SAID_MS);
    expect(button.textContent).toBe('Share');
  });

  it('clears and sets the status again, so a second "Copied!" is read out too', async () => {
    const t = setup();
    const button = await finish(t);
    const status = t.$('[role="status"]')!;
    const seen: string[] = [];
    new MutationObserver(() => seen.push(status.textContent ?? '')).observe(status, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    button.click();
    await settle();
    button.click();
    await settle();
    expect(seen.filter((text) => text === 'Copied!')).toHaveLength(2);
    expect(seen.at(-2)).toBe('');
  });
});

describe('app: results layout', () => {
  it('shows the results as a full-screen page, unmarked once gone', async () => {
    const t = setup();
    t.app.showStart();
    expect(document.documentElement.classList.contains(PAGE_CLASS)).toBe(false);
    t.controller.start();
    for (const text of ['Platypus', 'tiger', 'killer whale']) answer(t, text);
    await loaded(); // the results load when the run ends
    expect(document.documentElement.classList.contains(PAGE_CLASS)).toBe(true);
    t.app.destroy();
    expect(document.documentElement.classList.contains(PAGE_CLASS)).toBe(false);
  });
});

describe('app: a phone upright (portrait)', () => {
  const typing = () => document.documentElement.classList.contains(TYPING_CLASS);

  it('waits for a tap: no focus, "Tap to answer", the ring full until the box is focused', () => {
    const t = setup(INSTANT_REVEAL, 'portrait');
    t.controller.start();
    expect(document.activeElement).not.toBe(t.input());
    expect(t.input().placeholder).toBe('Tap to answer');
    t.time.advance(2_000);
    t.ui.set(0);
    expect(t.$('.timer-ring__label')?.textContent).toBe(String(ROUND_TIME_MS / 1000));
    t.input().focus();
    expect(typing()).toBe(true);
    t.time.advance(5_000);
    t.ui.set(0);
    expect(t.$('.timer-ring__label')?.textContent).toBe(String(ROUND_TIME_MS / 1000 - 5));
  });

  it('starts the timer by itself once the grace runs out', () => {
    const t = setup(INSTANT_REVEAL, 'portrait');
    t.controller.start();
    t.time.advance(ROUND_START_GRACE_MS + 1_000);
    t.ui.set(0);
    expect(t.$('.timer-ring__label')?.textContent).toBe(String(ROUND_TIME_MS / 1000 - 1));
  });

  it('keeps the keyboard for a wrong guess, closes it for a scored one, and never refocuses', () => {
    const t = setup(INSTANT_REVEAL, 'portrait');
    t.controller.start();
    t.input().focus();
    type(t.input(), 'zzzz');
    pressEnter(t.input());
    expect(document.activeElement).toBe(t.input());
    type(t.input(), 'tiger');
    pressEnter(t.input());
    expect(document.activeElement).not.toBe(t.input()); // blurred: the keyboard closes
    expect(typing()).toBe(false);
    t.$<HTMLButtonElement>('.reveal__next')!.click();
    expect(t.$('.round__prompt')?.textContent).toBe('Prompt 2');
    expect(document.activeElement).not.toBe(t.input());
  });
});

describe('app: closing the results pop-up', () => {
  it('shows the summary under the scene, which opens the results again', async () => {
    const t = setup(INSTANT_REVEAL, 'portrait');
    t.controller.start();
    for (const text of ['Platypus', 'tiger', 'killer whale']) {
      t.input().focus();
      type(t.input(), text);
      pressEnter(t.input());
      t.$<HTMLButtonElement>('.reveal__next')!.click();
    }
    await loaded(); // the results load when the run ends
    const score = t.$('.results .results__number')?.textContent;
    expect(score).toMatch(/^\d+$/);
    t.$<HTMLButtonElement>('.card__back')!.click();
    await loaded();
    expect(t.$('.results')).toBeNull();
    expect(t.$('.results-summary .results__number')?.textContent).toBe(score);
    expect(document.documentElement.classList.contains(PAGE_CLASS)).toBe(false);
    [...t.root.querySelectorAll<HTMLButtonElement>('button')]
      .find((b) => b.textContent === 'See results')!
      .click();
    await loaded();
    expect(t.$('.results')).not.toBeNull();
  });
});
