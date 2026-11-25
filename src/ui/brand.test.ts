// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { ANIMALS, PROMPT } from '@/core/matcher/testFixtures';
import { howToPlay } from './components/howToPlay';
import { pixelSvg } from './components/pixelArt';
import { themeChip } from './components/themeChip';
import { timerRing } from './components/timerRing';
import { topBar } from './components/topBar';
import { wordmark } from './components/wordmark';
import { h } from './dom';
import { placeOnStage } from './layout/stage';
import { resultsSummaryScreen } from './screens/resultsSummary';

describe('pixelSvg', () => {
  it('draws one rect per run of a colour, from tokens, sized by its grid', () => {
    const el = pixelSvg(['oo.a', 'aaaa'], 'x');
    expect(el.getAttribute('viewBox')).toBe('0 0 4 2');
    const groups = [...el.querySelectorAll('g')].map((g) => g.getAttribute('style'));
    expect(groups).toEqual(['fill: var(--ink)', 'fill: var(--accent)']);
    expect(el.querySelectorAll('rect')).toHaveLength(3); // oo, a, aaaa
  });
});

describe('wordmark', () => {
  it('reads "Tabimate" (and what follows it), in the size asked', () => {
    expect(wordmark('lg').getAttribute('aria-label')).toBe('Tabimate');
    const small = wordmark('sm', '#21');
    expect(small.className).toBe('wordmark wordmark--sm');
    expect(small.getAttribute('aria-label')).toBe('Tabimate #21');
    expect(small.textContent).toBe('#21');
  });
});

describe('topBar', () => {
  it('colours each answered footprint by its level and outlines the current one', () => {
    const bar = topBar(21, 7);
    bar.set([2, 0], 2);
    const prints = [...bar.el.querySelectorAll<HTMLElement>('.footprint')];
    expect(prints).toHaveLength(7);
    expect(prints[0]!.style.color).toBe('var(--level-2)');
    expect(prints[1]!.classList.contains('footprint--done')).toBe(true);
    expect(prints[2]!.classList.contains('footprint--current')).toBe(true);
    expect(prints[3]!.classList.contains('footprint--done')).toBe(false);
  });
});

describe('themeChip', () => {
  it('names the theme and the puzzle, or just the puzzle', () => {
    expect(themeChip(21, 'Fishy Friday').textContent).toBe('Fishy Friday · Puzzle #21');
    expect(themeChip(21, null).textContent).toBe('Puzzle #21');
  });
});

describe('howToPlay', () => {
  it('shows and hides the rules from its link', () => {
    const { toggle, rules } = howToPlay();
    expect(rules.hidden).toBe(true);
    toggle.click();
    expect(rules.hidden).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });
});

describe('placeOnStage', () => {
  it('puts decoration on the stage overlay, or in the fallback without one', () => {
    const fallback = h('div', {});
    const el = h('p', {}, 'Ready?');
    document.body.replaceChildren(fallback);
    let remove = placeOnStage(el, fallback);
    expect(el.parentElement).toBe(fallback);
    remove();
    const overlay = h('div', { id: 'stage-overlay' });
    document.body.append(overlay);
    remove = placeOnStage(el, fallback);
    expect(el.parentElement).toBe(overlay);
    remove();
    expect(el.isConnected).toBe(false);
  });
});

describe('timerRing colours', () => {
  it('turns amber at the amber time and red at the warning time', () => {
    let now = 0;
    const ring = timerRing({
      endsAt: 25_000,
      totalMs: 25_000,
      now: () => now,
      frames: () => () => {},
      warnAtMs: 5_000,
      amberAtMs: 10_000,
    });
    const set = (t: number) => {
      now = t;
      ring.setEndsAt(25_000);
    };
    set(15_000); // 10 s left
    expect(ring.el.classList.contains('timer-ring--amber')).toBe(true);
    set(20_000); // 5 s left
    expect(ring.el.classList.contains('timer-ring--amber')).toBe(false);
    expect(ring.el.classList.contains('timer-ring--low')).toBe(true);
    ring.destroy();
  });
});

describe('resultsSummaryScreen', () => {
  it('shows the score, the found team in a row, Share and See results', async () => {
    const root = h('div', {});
    let shared = 0;
    const tiger = ANIMALS.get('tiger')!;
    resultsSummaryScreen(
      root,
      {
        score: 85,
        biomeName: 'Forest',
        rounds: [
          {
            prompt: PROMPT,
            result: {
              promptId: PROMPT.id,
              timeMs: 1,
              match: { level: 4, animalId: 'tiger', strategy: 'exact', input: 'tiger' },
            },
            animal: tiger,
            answers: [],
          },
          {
            prompt: PROMPT,
            result: {
              promptId: PROMPT.id,
              timeMs: 1,
              match: { level: 0, animalId: null, strategy: null, input: '' },
            },
            animal: null,
            answers: [],
          },
        ],
      },
      {
        open: () => {},
        share: () => {
          shared++;
          return Promise.resolve('copied');
        },
        journal: () => {},
        achievements: () => {},
        history: () => {},
      },
    );
    expect(root.querySelector('.results__number')?.textContent).toBe('85');
    expect(root.querySelectorAll('.summary-team .portrait')).toHaveLength(1); // the miss left out
    const buttons = [...root.querySelectorAll('button')].map((b) => b.textContent);
    expect(buttons).toContain('See results');
    [...root.querySelectorAll('button')].find((b) => b.textContent === 'Share')!.click();
    await Promise.resolve();
    expect(shared).toBe(1);
  });
});
