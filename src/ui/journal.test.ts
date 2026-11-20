// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { TOAST } from '@/config/collection';
import { INSTANT_REVEAL } from '@/config/game';
import { achievementById } from '@/core/achievements/registry';
import type { Collection } from '@/core/collection';
import { createBus, type GameEvents } from '@/core/events';
import { createGameController } from '@/core/gameController';
import { addRun } from '@/core/journal/journal';
import { ANIMALS, PROMPT } from '@/core/matcher/testFixtures';
import { emptyStats } from '@/core/streak';
import { createFakeTime } from '@/core/testFakes';
import type { Puzzle } from '@/core/types';
import { createApp } from './app';
import { formatDateKey } from './format';
import { createScreenHost } from './host';
import { manualTime, pressEnter, pressKey, type } from './testUi';

const puzzle: Puzzle = {
  date: '2026-11-07',
  number: 2,
  prompts: ['r1', 'r2'].map((id) => ({ ...PROMPT, id })),
};
const hit = (animalId: string) => ({
  promptId: 'p',
  timeMs: 1,
  match: { level: 2 as const, animalId, strategy: 'exact' as const, input: animalId },
});

function setup(collection: Collection = { journal: {}, achievements: [] }) {
  document.body.innerHTML = '<main id="ui"></main>';
  const root = document.querySelector<HTMLElement>('#ui')!;
  const time = createFakeTime();
  const ui = manualTime(time.nowMs());
  const bus = createBus<GameEvents>();
  const controller = createGameController({
    puzzle,
    animals: ANIMALS,
    bus,
    clock: time.clock,
    scheduler: time.scheduler,
  });
  const app = createApp({
    host: createScreenHost(root),
    bus,
    controller,
    puzzle,
    animals: ANIMALS,
    clock: time.clock,
    getStats: emptyStats,
    getCollection: () => collection,
    reload: () => {},
    share: () => Promise.resolve('copied'),
    revealTiming: INSTANT_REVEAL,
    frames: ui.frames,
    delay: ui.delay,
  });
  const $ = (selector: string) => root.querySelector<HTMLElement>(selector);
  const $$ = (selector: string) => [...root.querySelectorAll<HTMLElement>(selector)];
  return { root, ui, bus, controller, app, $, $$ };
}

const button = (t: ReturnType<typeof setup>, text: string) =>
  t.$$('button').find((b) => b.textContent?.includes(text))!;

describe('Field Journal screen', () => {
  const tigerFound = addRun({}, { puzzleDate: '2026-11-05', results: [hit('tiger')] }).journal;

  it('opens from the start screen and goes back to it', () => {
    const t = setup();
    t.app.showStart();
    button(t, 'Field Journal').click();
    expect(t.$('h1')?.textContent).toBe('Field Journal');
    expect(t.$('.meta')?.textContent).toBe(`0 of ${ANIMALS.size} animals found`);
    button(t, 'Back').click();
    expect(t.$('h1')?.textContent).toBe('Tabimate');
  });

  it('shows found animals as buttons and the rest as nameless silhouettes', () => {
    const t = setup({ journal: tigerFound, achievements: [] });
    t.app.showStart();
    button(t, 'Field Journal').click();
    expect(t.$$('.journal-cell__button').map((b) => b.getAttribute('aria-label'))).toEqual([
      'Tiger',
    ]);
    const unknown = t.$$('.journal-cell--unknown');
    expect(unknown).toHaveLength(ANIMALS.size - 1);
    expect(unknown[0]?.textContent).not.toContain('Platypus');
  });

  it('opens a found animal to its page: first found date and times found', () => {
    const t = setup({ journal: tigerFound, achievements: [] });
    t.app.showStart();
    button(t, 'Field Journal').click();
    t.$('.journal-cell__button')!.click();
    const page = t.$('.journal-detail')!;
    expect(page.querySelector('h2')?.textContent).toBe('Tiger');
    expect(page.textContent).toContain(`First found ${formatDateKey('2026-11-05')} · Found once`);
    button(t, 'Close').click();
    expect(t.$('.journal-detail')).toBeNull();
  });

  it('has a tab per set with its progress, and the achievements', () => {
    const t = setup({
      journal: tigerFound,
      achievements: [{ id: 'streak-3', unlockedKey: '2026-11-07' }],
    });
    t.app.showStart();
    button(t, 'Field Journal').click();
    t.$$('[role="tab"]')
      .find((b) => b.textContent?.includes('Penguins'))!
      .click();
    expect(t.$('.journal__set')?.textContent).toBe('Penguins · 0 of 2');
    t.$$('[role="tab"]')
      .find((b) => b.textContent?.includes('Achievements'))!
      .click();
    const first = t.$('.badge')!;
    expect(first.textContent).toContain(achievementById('streak-3')!.name);
    expect(first.textContent).toContain(`Unlocked ${formatDateKey('2026-11-07')}`);
    expect(t.$$('.badge--locked').length).toBeGreaterThan(0);
  });
});

describe('collection toasts and the reveal tag', () => {
  it('toasts each unlocked achievement in turn, then clears', () => {
    const t = setup();
    const streak = achievementById('streak-3')!;
    const jackpot = achievementById('first-jackpot')!;
    t.bus.emit('achievementUnlocked', { achievement: streak, unlockedKey: '2026-11-07' });
    t.bus.emit('achievementUnlocked', { achievement: jackpot, unlockedKey: '2026-11-07' });
    const toast = () => t.$('.toast-layer')?.textContent ?? '';
    expect(toast()).toContain(streak.name);
    t.ui.set(t.ui.now() + TOAST.showMs);
    expect(toast()).toContain(jackpot.name);
    t.ui.set(t.ui.now() + TOAST.showMs);
    expect(toast()).toBe('');
  });

  it('says how many animals a run added to the journal', () => {
    const t = setup();
    t.bus.emit('journalUpdated', { journal: {}, newlyFound: ['tiger', 'platypus'] });
    expect(t.$('.toast')?.textContent).toContain('2 new animals added');
  });

  it('tags a first-ever find on its reveal, but not an animal already in the journal', () => {
    const known = addRun({}, { puzzleDate: '2026-11-01', results: [hit('platypus')] }).journal;
    const t = setup({ journal: known, achievements: [] });
    t.app.showStart();
    button(t, 'Play').click();
    const input = t.$('#answer') as HTMLInputElement;
    type(input, 'Platypus');
    pressEnter(input);
    expect(t.$('.reveal-extra--new')).toBeNull();
    pressKey(input, 'Enter');
    type(input, 'Tiger');
    pressEnter(input);
    expect(t.$('.reveal-extra--new')?.textContent).toBe('New to your journal!');
  });
});

describe('formatDateKey', () => {
  it('reads a puzzle key as a date, without time zones', () => {
    expect(formatDateKey('2026-11-07')).toBe('7 Nov 2026');
    expect(formatDateKey('nonsense')).toBe('nonsense');
  });
});
