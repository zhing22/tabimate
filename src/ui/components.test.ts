// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { TIERS } from '@/config/tiers';
import { countdown } from './components/countdown';
import { teamCard } from './components/teamCard';
import { tierBadge } from './components/tierBadge';
import { timerRing } from './components/timerRing';
import { formatCountdown, secondsLeft } from './format';
import { revealScreen } from './screens/reveal';
import { manualTime } from './testUi';

describe('format', () => {
  it.each([
    [0, '00:00:00'],
    [999, '00:00:01'],
    [3_723_000, '01:02:03'],
    [-5, '00:00:00'],
  ])('formatCountdown(%i) = %s', (ms, text) => {
    expect(formatCountdown(ms)).toBe(text);
  });

  it('rounds seconds up so the ring never shows 0 early', () => {
    expect(secondsLeft(200)).toBe(1);
    expect(secondsLeft(0)).toBe(0);
  });
});

describe('timerRing', () => {
  it('draws from endsAt each frame and turns urgent near the end', () => {
    const t = manualTime();
    const ring = timerRing({
      endsAt: 25_000,
      totalMs: 25_000,
      now: t.now,
      frames: t.frames,
      warnAtMs: 5_000,
    });
    expect(ring.el.textContent).toBe('25');
    expect(ring.el.getAttribute('role')).toBe('timer');
    t.set(19_500);
    expect(ring.el.textContent).toBe('6');
    expect(ring.el.classList.contains('timer-ring--low')).toBe(false);
    t.set(20_500);
    expect(ring.el.textContent).toBe('5');
    expect(ring.el.classList.contains('timer-ring--low')).toBe(true);
    t.set(30_000);
    expect(ring.el.textContent).toBe('0');
  });

  it('can be pointed at a new deadline, and stops on destroy', () => {
    const t = manualTime();
    const ring = timerRing({
      endsAt: 1_000,
      totalMs: 25_000,
      now: t.now,
      frames: t.frames,
      warnAtMs: 5_000,
    });
    ring.setEndsAt(25_000);
    expect(ring.el.textContent).toBe('25');
    ring.destroy();
    expect(t.running()).toBe(0);
  });

  it('freeze holds what it shows until it gets a new deadline', () => {
    const t = manualTime();
    const ring = timerRing({
      endsAt: 25_000,
      totalMs: 25_000,
      now: t.now,
      frames: t.frames,
      warnAtMs: 5_000,
    });
    t.set(22_000);
    ring.freeze();
    expect(t.running()).toBe(0);
    t.set(30_000);
    expect(ring.el.textContent).toBe('3');
    ring.setEndsAt(55_000);
    expect(ring.el.textContent).toBe('25');
    expect(t.running()).toBe(1);
    t.set(50_000);
    expect(ring.el.textContent).toBe('5');
    ring.destroy();
    expect(t.running()).toBe(0);
  });
});

describe('countdown', () => {
  it('shows HH:MM:SS and calls onDone once at zero', () => {
    const t = manualTime();
    const onDone = vi.fn();
    const c = countdown({ msLeft: () => 2_000 - t.now(), onDone, interval: t.interval });
    expect(c.el.textContent).toBe('00:00:02');
    t.set(2_000);
    t.set(3_000);
    expect(c.el.textContent).toBe('00:00:00');
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(t.running()).toBe(0);
  });
});

describe('tierBadge and teamCard', () => {
  it('labels the tier and colours it from the tokens', () => {
    const { el } = tierBadge(3);
    expect(el.textContent).toBe('VU · Vulnerable');
    expect(el.getAttribute('style')).toContain('var(--tier-3)');
    expect(tierBadge(0).el.textContent).toBe('No match');
  });

  it('compact badges show the code but keep the full name for screen readers', () => {
    const { el } = tierBadge(5, { compact: true });
    expect(el.textContent).toBe('CR');
    expect(el.getAttribute('aria-label')).toBe('Critically Endangered');
  });

  it('lists each prompt with the animal found, or a miss', () => {
    const prompt = { id: 'p', text: 'Lays eggs', answers: [] };
    const { el } = teamCard([
      {
        prompt,
        animal: null,
        result: {
          promptId: 'p',
          timeMs: 1,
          match: { tier: 0, animalId: null, strategy: null, input: '' },
        },
      },
    ]);
    expect(el.querySelectorAll('li')).toHaveLength(1);
    expect(el.textContent).toContain('No match');
    expect(el.textContent).toContain('Lays eggs');
  });
});

describe('revealScreen', () => {
  it.each(TIERS.map((t) => [t.id, t.effectId] as const))(
    'tier %i carries its effect %s from TIERS',
    (tier, effect) => {
      const root = document.createElement('div');
      const match =
        tier === 0
          ? ({ tier, animalId: null, strategy: null, input: 'x' } as const)
          : ({ tier, animalId: 'tiger', strategy: 'exact', input: 'x' } as const);
      const result = { promptId: 'p', timeMs: 1, match };
      revealScreen(
        root,
        { result, animal: null, points: 0, suspenseMs: 0, isLast: false, focusNext: false },
        { revealed: () => {}, next: () => {} },
      );
      const card = root.querySelector<HTMLElement>('.reveal')!;
      expect(card.dataset['effect']).toBe(effect);
      expect(card.getAttribute('style')).toContain(`var(--tier-${tier})`);
    },
  );
});
