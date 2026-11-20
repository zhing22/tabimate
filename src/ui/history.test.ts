// @vitest-environment jsdom
// v2 Step 10: the history calendar, streak freezes on the start screen,
// tomorrow's theme on the results, and the install hint.
import { describe, expect, it, vi } from 'vitest';
import { SCORE_BANDS } from '@/config/history';
import { THEMES } from '@/config/themes';
import type { InstallOffer } from '@/core/install';
import { ANIMALS, PROMPT } from '@/core/matcher/testFixtures';
import { emptyStats, type Stats } from '@/core/streak';
import { installHint } from './components/installHint';
import { dayDetail, historyWeeks, monthRange } from './historyView';
import { resultsProps } from './resultsProps';
import { historyScreen } from './screens/history';
import { startScreen } from './screens/start';

const stats: Stats = {
  ...emptyStats(),
  history: [
    { key: '2026-10-30', score: 40, levels: [1] },
    {
      key: '2026-11-07',
      score: SCORE_BANDS[2].min,
      levels: [4, 0],
      animalIds: ['tiger', null],
    },
  ],
  frozenKeys: ['2026-11-06'],
};

describe('historyView', () => {
  it('spans the first month played to this month', () => {
    expect(monthRange(stats, '2026-11-20')).toEqual({
      first: { year: 2026, month: 10 },
      last: { year: 2026, month: 11 },
    });
    expect(monthRange(emptyStats(), '2026-11-20').first).toEqual({ year: 2026, month: 11 });
  });

  it("marks each day's record, freezes and today", () => {
    const days = historyWeeks({ year: 2026, month: 11 }, stats, '2026-11-20').flat();
    const day = (n: number) => days.find((d) => d?.day === n)!;
    expect(day(7).entry?.score).toBe(SCORE_BANDS[2].min);
    expect(day(6)).toMatchObject({ entry: null, frozen: true });
    expect(day(20).today).toBe(true);
  });

  it("names a day's team, or keeps levels only for days saved before v4", () => {
    const [old, recent] = stats.history;
    expect(dayDetail(recent!, ANIMALS)).toMatchObject({
      bandLabel: SCORE_BANDS[2].label,
      hasAnimals: true,
      team: [
        { level: 4, animal: { id: 'tiger' } },
        { level: 0, animal: null },
      ],
    });
    expect(dayDetail(old!, ANIMALS)).toMatchObject({ hasAnimals: false, team: [{ animal: null }] });
  });
});

describe('history screen', () => {
  const open = () => {
    const root = document.createElement('div');
    const close = vi.fn();
    historyScreen(root, { stats, animals: ANIMALS, todayKey: '2026-11-20' }, { close });
    const $ = (s: string) => root.querySelector<HTMLElement>(s);
    const button = (label: string) =>
      root.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!;
    return { root, $, button, close };
  };

  it('opens on this month, steps back to the first month played and no further', () => {
    const t = open();
    expect(t.$('.calendar-nav__title')?.textContent).toBe('November 2026');
    expect(t.button('Next month').disabled).toBe(true);
    t.button('Previous month').click();
    expect(t.$('.calendar-nav__title')?.textContent).toBe('October 2026');
    expect(t.button('Previous month').disabled).toBe(true);
  });

  it('colours played days by band, shows freezes, and opens a day to its team', () => {
    const t = open();
    const played = t.root.querySelectorAll('.calendar__day--played');
    expect(played).toHaveLength(1);
    expect(t.$('.calendar__day--frozen')?.textContent).toBe('❄');
    (played[0] as HTMLElement).click();
    expect(t.$('.day-detail')?.textContent).toContain('Tiger');
    expect(t.$('.day-detail')?.textContent).toContain(`${SCORE_BANDS[2].min} points`);
  });
});

describe('start screen streak', () => {
  const start = (savedByFreeze: boolean, freezeReady: boolean) => {
    const root = document.createElement('div');
    const props = {
      puzzleNumber: 1,
      promptCount: 7,
      streak: 8,
      savedByFreeze,
      freezeReady,
      theme: null,
    };
    startScreen(root, props, { play: () => {}, journal: () => {}, history: () => {} });
    return root.querySelector('.streak')?.textContent ?? '';
  };

  it('says when a freeze saved the streak, or that one is ready', () => {
    expect(start(true, false)).toContain('Streak saved by a freeze');
    expect(start(false, true)).toContain('Freeze ready');
    expect(start(false, false)).toBe('🔥 8-day streak');
  });
});

describe("tomorrow's theme", () => {
  it("names tomorrow's theme and nothing else about tomorrow", () => {
    const friday = THEMES.find((t) => t.id === 'fishy-friday')!;
    // 2026-11-19 is a Thursday: tomorrow is Fishy Friday.
    const puzzle = { date: '2026-11-19', number: 1, prompts: [PROMPT] };
    const props = resultsProps(
      puzzle,
      () => null,
      ANIMALS,
      {
        results: [],
        score: 0,
        stats: emptyStats(),
      },
      () => 0,
    );
    expect(props.tomorrowTheme).toBe(friday.name);
  });
});

describe('install hint', () => {
  const offer = (over: Partial<InstallOffer> = {}): InstallOffer => ({
    shouldShow: () => true,
    canPrompt: () => true,
    prompt: vi.fn(() => Promise.resolve(true)),
    dismiss: vi.fn(),
    ...over,
  });

  it('is absent until the offer says so', () => {
    expect(installHint(offer({ shouldShow: () => false }))).toBeNull();
    expect(installHint(undefined)).toBeNull();
  });

  it("opens the browser's dialog, or explains the share menu where there is none", () => {
    const prompt = vi.fn(() => Promise.resolve(true));
    const el = installHint(offer({ prompt }))!;
    el.querySelector<HTMLButtonElement>('.button')!.click();
    expect(prompt).toHaveBeenCalled();
    const ios = installHint(offer({ canPrompt: () => false }))!;
    expect(ios.querySelector('.button')).toBeNull();
    expect(ios.textContent).toContain('Share menu');
  });

  it('"Not now" dismisses it for good', () => {
    const dismiss = vi.fn();
    const parent = document.createElement('div');
    parent.append(installHint(offer({ dismiss }))!);
    parent.querySelector<HTMLButtonElement>('.install-hint__dismiss')!.click();
    expect(dismiss).toHaveBeenCalled();
    expect(parent.children).toHaveLength(0);
  });
});
