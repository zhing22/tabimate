// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { INSTANT_REVEAL } from '@/config/game';
import { ACHIEVEMENTS, achievementById } from '@/core/achievements/registry';
import type { Collection } from '@/core/collection';
import { createBus, type GameEvents } from '@/core/events';
import { createGameController } from '@/core/gameController';
import { ANIMALS, PROMPT } from '@/core/matcher/testFixtures';
import { emptyStats, type Stats } from '@/core/streak';
import { createFakeTime } from '@/core/testFakes';
import type { Puzzle } from '@/core/types';
import { badgeSections } from './achievementsView';
import { createApp } from './app';
import { badgeId } from './components/badgeList';
import { formatDateKey } from './format';
import { createScreenHost } from './host';
import { manualTime } from './testUi';

const puzzle: Puzzle = { date: '2026-11-07', number: 2, prompts: [PROMPT] };
const STREAK_4: Stats = { ...emptyStats(), bestStreak: 4 };

function setup(collection: Collection, stats: Stats = STREAK_4) {
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
    getStats: () => stats,
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
  const button = (text: string) => $$('button').find((b) => b.textContent?.includes(text))!;
  return { root, bus, app, $, $$, button };
}

const unlockedStreak = {
  journal: {},
  achievements: [{ id: 'streak-3', unlockedKey: '2026-11-07' }],
};

describe('Achievements page', () => {
  it('opens from the start screen beside Journal and History, and goes back', async () => {
    const t = setup(unlockedStreak);
    t.app.showStart();
    const links = t.$$('.collection-links button').map((b) => b.textContent);
    expect(links).toEqual(['Field Journal', 'Achievements', 'History']);
    t.button('Achievements').click();
    await vi.dynamicImportSettled(); // the page loads on first open
    expect(document.activeElement?.textContent).toBe('Achievements');
    expect(t.$('.page-head .meta')?.textContent).toBe(`1 of ${ACHIEVEMENTS.length} unlocked`);
    t.button('Back').click();
    expect(t.$('.collection-links')).not.toBeNull();
  });

  it('groups badges by section, empty sections left out', async () => {
    const t = setup(unlockedStreak);
    t.app.showStart();
    t.button('Achievements').click();
    await vi.dynamicImportSettled(); // the page loads on first open
    const headings = t.$$('.achievements__heading').map((h) => h.textContent);
    expect(headings[0]).toContain('Streaks');
    expect(headings[0]).toContain('1 of 3');
    expect(headings.some((h) => h?.includes('Encounters'))).toBe(false);
    expect(t.$$('.achievements__section')).toHaveLength(headings.length);
  });

  it('shows an unlocked badge with its date, a locked one dimmed with its progress', async () => {
    const t = setup(unlockedStreak);
    t.app.showStart();
    t.button('Achievements').click();
    await vi.dynamicImportSettled(); // the page loads on first open
    const won = t.$(`#${badgeId('streak-3')}`)!;
    expect(won.classList.contains('badge--locked')).toBe(false);
    expect(won.textContent).toContain(`Unlocked ${formatDateKey('2026-11-07')}`);
    expect(won.querySelector('progress')).toBeNull();
    const next = t.$(`#${badgeId('streak-7')}`)!;
    expect(next.classList.contains('badge--locked')).toBe(true);
    expect(next.textContent).toContain(achievementById('streak-7')!.description);
    const bar = next.querySelector('progress')!;
    expect([bar.getAttribute('value'), bar.getAttribute('max')]).toEqual(['4', '7']);
    expect(bar.getAttribute('aria-label')).toBe('7-day streak: 4 of 7');
    // A one-off has no bar.
    expect(t.$(`#${badgeId('first-jackpot')}`)!.querySelector('progress')).toBeNull();
  });

  it('opens from a tapped achievement toast, scrolled to that badge', async () => {
    const t = setup(unlockedStreak);
    t.app.showStart();
    const streak = achievementById('streak-3')!;
    t.bus.emit('achievementUnlocked', { achievement: streak, unlockedKey: '2026-11-07' });
    const open = t.$('.toast__open')!;
    expect(open.getAttribute('aria-label')).toBe(`Open achievements: ${streak.name}`);
    open.click();
    await vi.dynamicImportSettled(); // the page loads on first open
    expect(document.activeElement?.id).toBe(badgeId('streak-3'));
    expect(t.$(`#${badgeId('streak-3')}`)!.classList.contains('badge--focus')).toBe(true);
    t.button('Back').click(); // back to the screen the toast showed over
    expect(t.$('.collection-links')).not.toBeNull();
  });
});

describe('collection pages loading on first open', () => {
  it('shows only the page asked for last, however the loads finish', async () => {
    const t = setup(unlockedStreak);
    t.app.showStart();
    t.button('Field Journal').click();
    t.button('Achievements').click(); // asked for before the journal has loaded
    await vi.dynamicImportSettled();
    expect(t.$('h1')?.textContent).toBe('Achievements');
    expect(t.$('.journal')).toBeNull();
  });
});

describe('badgeSections', () => {
  it('gives progress only to locked, count-based achievements', () => {
    const sections = badgeSections(unlockedStreak, {
      history: [],
      stats: STREAK_4,
      animals: ANIMALS,
    });
    const lines = sections.flatMap((s) => s.lines);
    expect(lines.find((l) => l.achievement.id === 'streak-3')!.progress).toBeNull();
    expect(lines.find((l) => l.achievement.id === 'streak-30')!.progress).toEqual({
      current: 4,
      target: 30,
    });
    expect(lines.find((l) => l.achievement.id === 'first-group')!.progress).toBeNull();
  });
});
