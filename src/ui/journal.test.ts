// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
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
import { UNKNOWN_NAME } from './components/journalGrid';
import { nextTabIndex } from './components/tabKeys';
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
    getStreakStatus: () => ({ streak: 0, savedByFreeze: false }),
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

  it('opens from the start screen and goes back to it', async () => {
    const t = setup();
    t.app.showStart();
    button(t, 'Field Journal').click();
    await vi.dynamicImportSettled(); // the page loads on first open
    expect(t.$('h1')?.textContent).toBe('Field Journal');
    expect(t.$('.meta')?.textContent).toBe(`0 of ${ANIMALS.size} animals found`);
    (t.$('.card__back') as HTMLButtonElement).click();
    expect(t.$('h1 [role="img"]')?.getAttribute('aria-label')).toBe('Tabimate');
  });

  it('opens History from the start screen too, and goes back', async () => {
    const t = setup();
    t.app.showStart();
    button(t, 'History').click();
    await vi.dynamicImportSettled(); // the page loads on first open
    expect(t.$('h1')?.textContent).toBe('History');
    expect(t.$('.calendar')).not.toBeNull();
    (t.$('.card__back') as HTMLButtonElement).click();
    expect(t.$('h1 [role="img"]')?.getAttribute('aria-label')).toBe('Tabimate');
  });

  it('names found animals under their picture, and the rest "???" as silhouettes', async () => {
    const t = setup({ journal: tigerFound, achievements: [] });
    t.app.showStart();
    button(t, 'Field Journal').click();
    await vi.dynamicImportSettled(); // the page loads on first open
    expect(t.$$('.journal-cell__button').map((b) => b.textContent)).toEqual(['🐾Tiger']);
    const unknown = t.$$('.journal-cell--unknown');
    expect(unknown).toHaveLength(ANIMALS.size - 1);
    expect(unknown[0]?.querySelector('.journal-cell__name')?.textContent).toBe(UNKNOWN_NAME);
    expect(unknown[0]?.textContent).not.toContain('Platypus');
  });

  it('counts a group answer ("penguin") as found, in the grid and the total', async () => {
    const penguin = addRun({}, { puzzleDate: '2026-11-05', results: [hit('penguin')] }).journal;
    const t = setup({ journal: penguin, achievements: [] });
    t.app.showStart();
    button(t, 'Field Journal').click();
    await vi.dynamicImportSettled(); // the page loads on first open
    expect(t.$('.meta')?.textContent).toBe(`1 of ${ANIMALS.size} animals found`);
    expect(t.$('.journal-cell__button .journal-cell__name')?.textContent).toBe('Penguin');
  });

  it('moves between tabs with the arrow keys, Home and End; only the selected one is tabbable', async () => {
    const t = setup();
    t.app.showStart();
    button(t, 'Field Journal').click();
    await vi.dynamicImportSettled(); // the page loads on first open
    const tabs = t.$$('[role="tab"]');
    const selected = () => tabs.findIndex((b) => b.getAttribute('aria-selected') === 'true');
    expect(tabs.map((b) => b.tabIndex)).toEqual(tabs.map((_, i) => (i === 0 ? 0 : -1)));
    tabs[0]!.focus();
    pressKey(tabs[0]!, 'ArrowRight');
    expect(selected()).toBe(1);
    expect(document.activeElement).toBe(tabs[1]);
    pressKey(tabs[1]!, 'End');
    expect(selected()).toBe(tabs.length - 1);
    pressKey(tabs.at(-1)!, 'ArrowRight'); // wraps round
    expect(selected()).toBe(0);
    expect(tabs[0]!.tabIndex).toBe(0);
    expect(tabs[1]!.tabIndex).toBe(-1);
  });

  it('opens a found animal to its page: first found date and times found', async () => {
    const t = setup({ journal: tigerFound, achievements: [] });
    t.app.showStart();
    button(t, 'Field Journal').click();
    await vi.dynamicImportSettled(); // the page loads on first open
    t.$('.journal-cell__button')!.click();
    const page = t.$('.journal-detail')!;
    expect(page.querySelector('h2')?.textContent).toBe('Tiger');
    expect(page.textContent).toContain(`First found ${formatDateKey('2026-11-05')} · Found once`);
    button(t, 'Close').click();
    expect(t.$('.journal-detail')).toBeNull();
  });

  it('has a tab per set with its progress, and no achievements tab (they have their own page)', async () => {
    const t = setup({ journal: tigerFound, achievements: [] });
    t.app.showStart();
    button(t, 'Field Journal').click();
    await vi.dynamicImportSettled(); // the page loads on first open
    t.$$('[role="tab"]')
      .find((b) => b.textContent?.includes('Penguins'))!
      .click();
    expect(t.$('.journal__set')?.textContent).toBe('Penguins · 0 of 2');
    expect(t.$$('[role="tab"]').some((b) => b.textContent?.includes('Achievements'))).toBe(false);
    expect(t.$('.badge')).toBeNull();
  });
});

describe('Field Journal header', () => {
  it('has Back on the right and no ×; the animal page keeps its own ×', async () => {
    const tigerFound = addRun({}, { puzzleDate: '2026-11-05', results: [hit('tiger')] }).journal;
    const t = setup({ journal: tigerFound, achievements: [] });
    t.app.showStart();
    button(t, 'Field Journal').click();
    await vi.dynamicImportSettled(); // the page loads on first open
    const header = t.$('.card__header')!;
    expect(header.lastElementChild?.textContent).toBe('‹ Back');
    expect(header.textContent).not.toContain('×');
    (t.$('.journal-cell__button') as HTMLButtonElement).click();
    expect(t.$('.journal-detail')?.textContent).toContain('×');
    button(t, 'Close').click();
    expect(t.$('.journal-detail')).toBeNull();
    expect(t.$('h1')?.textContent).toBe('Field Journal'); // still in the journal
    (t.$('.card__back') as HTMLButtonElement).click();
    expect(t.$('h1 [role="img"]')?.getAttribute('aria-label')).toBe('Tabimate');
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
    expect(t.$('.reveal__ribbon')).toBeNull();
    pressKey(input, 'Enter');
    type(input, 'Tiger');
    pressEnter(input);
    // A "New" ribbon on the sprite; screen readers hear "New to your journal".
    expect(t.$('.reveal__ribbon')?.textContent).toBe('New to your journal');
  });
});

describe('formatDateKey', () => {
  it('reads a puzzle key as a date, without time zones', () => {
    expect(formatDateKey('2026-11-07')).toBe('7 Nov 2026');
    expect(formatDateKey('nonsense')).toBe('nonsense');
  });
});

describe('nextTabIndex', () => {
  it('steps and wraps with the arrows, jumps with Home and End, ignores other keys', () => {
    expect(nextTabIndex('ArrowLeft', 0, 4)).toBe(3);
    expect(nextTabIndex('ArrowRight', 3, 4)).toBe(0);
    expect(nextTabIndex('Home', 2, 4)).toBe(0);
    expect(nextTabIndex('End', 0, 4)).toBe(3);
    expect(nextTabIndex('a', 1, 4)).toBeNull();
  });
});
