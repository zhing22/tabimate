// @vitest-environment jsdom
// The loading screen and its timing (v2 Step 7).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LOADING } from '@/config/game';
import { ANIMALS } from '@/core/matcher/testFixtures';
import type { Animal } from '@/core/types';
import { createScreenHost } from './host';
import { startLoading } from './loadingFlow';
import { loadingText, loadingView, pickFact } from './screens/loading';

const described = (id: string, description: string): Animal => ({
  ...ANIMALS.get(id)!,
  description,
});

describe('loadingView', () => {
  const withKit = (on: boolean) =>
    on
      ? document.documentElement.setAttribute('data-kit', 'ready')
      : document.documentElement.removeAttribute('data-kit');

  it('shows the puzzle number, the theme, and the kit party on a progress-bar path', () => {
    withKit(true);
    const view = loadingView({ puzzleNumber: 31, theme: { name: 'Fishy Friday' } });
    expect(view.el.querySelector('h1 [role="img"]')!.getAttribute('aria-label')).toBe('Tabimate');
    expect(view.el.querySelector('.theme-chip')!.textContent).toBe('Fishy Friday · Puzzle #31');
    expect(view.el.textContent).toContain('Packing your bag for Fishy Friday…');
    const walkers = [...view.el.querySelectorAll('.loading__walker > .kit')].map(
      (w) => w.className,
    );
    expect(walkers).toEqual(['kit kit--animal', 'kit kit--traveller']); // the animal behind
    const bar = view.el.querySelector<HTMLElement>('[role=progressbar]')!;
    view.setProgress(0.5);
    expect(bar.getAttribute('aria-valuenow')).toBe('50');
    expect(bar.style.getPropertyValue('--progress')).toBe('50%');
    view.setProgress(2);
    expect(bar.getAttribute('aria-valuenow')).toBe('100');
  });

  it('never shows emoji: the kit walks in the middle of the card from the start', () => {
    withKit(true);
    const view = loadingView({ puzzleNumber: 1, theme: null });
    const hero = view.el.querySelector<HTMLElement>('.loading__hero')!;
    expect(hero.querySelectorAll('.kit')).toHaveLength(2);
    expect(view.el.textContent).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('without the kit shows the traveller only, as its still once the portraits are in', async () => {
    withKit(false);
    const view = loadingView({ puzzleNumber: 1, theme: null });
    const hero = view.el.querySelector<HTMLElement>('.loading__hero')!;
    expect(hero.childElementCount).toBe(0);
    expect(view.el.querySelectorAll('.loading__walker')).toHaveLength(0);
    const still = { src: 'data:still', width: 16, height: 24, facesLeft: false };
    view.setPortraits((animal: Animal | null) => Promise.resolve(animal ? null : still));
    await Promise.resolve();
    expect(hero.querySelectorAll('img')).toHaveLength(1);
    expect(view.el.textContent).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('adds a "Did you know?" line once there is a fact', () => {
    const view = loadingView({ puzzleNumber: 1, theme: null });
    const fact = view.el.querySelector<HTMLElement>('.loading__fact')!;
    expect(fact.hidden).toBe(true);
    view.setFact(described('tiger', 'The largest living cat.'));
    expect(fact.hidden).toBe(false);
    expect(fact.textContent).toBe('Did you know? Tiger: The largest living cat.');
    view.setFact(null);
    expect(fact.hidden).toBe(true);
  });

  it('matches the static line in index.html on a plain day, so nothing jumps', () => {
    expect(readFileSync('index.html', 'utf8')).toContain(
      `<p class="loading">${loadingText(null)}</p>`,
    );
  });
});

describe('pickFact', () => {
  it('picks a random animal that has a description, or none', () => {
    const animals = [
      ANIMALS.get('platypus')!,
      described('tiger', 'A cat.'),
      described('red-fox', 'A fox.'),
    ];
    expect(pickFact(animals, () => 0)?.id).toBe('tiger');
    expect(pickFact(animals, () => 0.99)?.id).toBe('red-fox');
    expect(pickFact([ANIMALS.get('platypus')!])).toBeNull();
  });
});

const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

/** A hand-driven clock and delay for startLoading. */
function fakeTime() {
  let t = 0;
  const timers: { at: number; fn: () => void }[] = [];
  return {
    now: () => t,
    delay: (fn: () => void, ms: number) => {
      timers.push({ at: t + ms, fn });
      return () => {};
    },
    /** Lets pending promise steps run (and schedule their timers), then moves the clock. */
    async advance(ms: number) {
      await flush();
      t += ms;
      for (const timer of timers.filter((x) => x.at <= t)) {
        timers.splice(timers.indexOf(timer), 1);
        timer.fn();
      }
      await flush();
    },
  };
}

describe('startLoading', () => {
  const setup = () => {
    const root = document.createElement('main');
    const host = createScreenHost(root);
    const time = fakeTime();
    const loading = startLoading(host, '2026-11-27', { ...time, random: () => 0 });
    const bar = () => root.querySelector('[role=progressbar]')!.getAttribute('aria-valuenow');
    return { root, loading, time, bar };
  };

  it('shows at once with the day from the date, then moves on as things load', () => {
    const { root, loading, bar } = setup();
    expect(root.textContent).toContain('Puzzle #22');
    expect(root.textContent).toContain('Fishy Friday'); // 2026-11-27 is a Friday
    expect(bar()).toBe('10');
    loading.loaded(new Map([['tiger', described('tiger', 'A cat.')]]));
    expect(bar()).toBe('50');
    expect(root.textContent).toContain('Did you know? Tiger: A cat.');
  });

  it(`changes the "Did you know?" line every ${LOADING.factMs} ms`, async () => {
    const root = document.createElement('main');
    const time = fakeTime();
    let roll = 0;
    const loading = startLoading(createScreenHost(root), '2026-11-27', {
      ...time,
      random: () => roll,
    });
    loading.loaded(
      new Map([
        ['tiger', described('tiger', 'A cat.')],
        ['red-fox', described('red-fox', 'A fox.')],
      ]),
    );
    expect(root.textContent).toContain('Tiger: A cat.');
    roll = 0.99;
    await time.advance(LOADING.factMs);
    expect(root.textContent).toContain('Red fox: A fox.');
  });

  it(`stays up at least ${LOADING.minMs} ms, but no longer than needed`, async () => {
    const { loading, time, bar } = setup();
    let done = false;
    void loading.finish(Promise.resolve()).then(() => (done = true));
    await time.advance(0);
    expect(bar()).toBe('100');
    await time.advance(LOADING.minMs - 1);
    expect(done).toBe(false);
    await time.advance(1);
    expect(done).toBe(true);

    // Already up longer than the minimum: no extra wait once ready.
    const slow = setup();
    await slow.time.advance(LOADING.minMs + 500);
    let slowDone = false;
    void slow.loading.finish(Promise.resolve()).then(() => (slowDone = true));
    await slow.time.advance(0);
    expect(slowDone).toBe(true);
  });

  it(`waits for the sprites, but at most ${LOADING.spriteWaitMs} ms, and not for a failure`, async () => {
    const { loading, time } = setup();
    let done = false;
    void loading.finish(new Promise(() => {})).then(() => (done = true)); // never ready
    await time.advance(LOADING.spriteWaitMs - 1);
    expect(done).toBe(false);
    await time.advance(1);
    expect(done).toBe(true);

    const failed = setup();
    let failedDone = false;
    void failed.loading
      .finish(Promise.reject(new Error('no sheets')))
      .then(() => (failedDone = true));
    await failed.time.advance(LOADING.minMs);
    expect(failedDone).toBe(true);
  });
});
