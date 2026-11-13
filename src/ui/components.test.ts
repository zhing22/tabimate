// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { INSTANT_REVEAL } from '@/config/game';
import { TIERS } from '@/config/tiers';
import { ANIMALS } from '@/core/matcher/testFixtures';
import { countdown } from './components/countdown';
import { partyLineup } from './components/partyLineup';
import { portrait } from './components/portrait';
import { teamCard, type TeamRound } from './components/teamCard';
import { answerLines } from './resultsProps';
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
    const c = countdown({ msLeft: () => 2_000 - t.now(), onDone, delay: t.delay });
    expect(c.el.textContent).toBe('00:00:02');
    t.set(2_000);
    t.set(3_000);
    expect(c.el.textContent).toBe('00:00:00');
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(t.running()).toBe(0);
  });

  // Opened 0.4 s into a second: each update must land on the second boundary,
  // not a second after the screen opened, so it reads 00:00:00 exactly at the target.
  it('changes exactly when the second changes, and hits zero on time', () => {
    const t = manualTime();
    const onDone = vi.fn();
    const c = countdown({ msLeft: () => 3_400 - t.now(), onDone, delay: t.delay });
    expect(c.el.textContent).toBe('00:00:04');
    t.set(399);
    expect(c.el.textContent).toBe('00:00:04');
    t.set(400);
    expect(c.el.textContent).toBe('00:00:03');
    t.set(3_399);
    expect(c.el.textContent).toBe('00:00:01');
    expect(onDone).not.toHaveBeenCalled();
    t.set(3_400);
    expect(c.el.textContent).toBe('00:00:00');
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('finishes at once, scheduling nothing, if the time is already up', () => {
    const t = manualTime();
    const onDone = vi.fn();
    const c = countdown({ msLeft: () => -500, onDone, delay: t.delay });
    expect(c.el.textContent).toBe('00:00:00');
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(t.running()).toBe(0);
  });

  it('stops its timer when destroyed', () => {
    const t = manualTime();
    countdown({ msLeft: () => 60_000 - t.now(), delay: t.delay }).destroy();
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
        answers: [],
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
        {
          result,
          animal: null,
          points: 0,
          timing: INSTANT_REVEAL,
          isLast: false,
          focusNext: false,
        },
        { revealed: () => {}, next: () => {} },
      );
      const card = root.querySelector<HTMLElement>('.reveal')!;
      expect(card.dataset['effect']).toBe(effect);
      expect(card.getAttribute('style')).toContain(`var(--tier-${tier})`);
    },
  );
});

describe('revealScreen beats', () => {
  const timing = { suspenseMs: 600, perTierMs: 150, badgePopMs: 420, nameDelayMs: 350 };
  const reveal = (tier: 0 | 1 | 4 | 5) => {
    const root = document.createElement('div');
    const match =
      tier === 0
        ? ({ tier, animalId: null, strategy: null, input: '' } as const)
        : ({ tier, animalId: 'tiger', strategy: 'exact', input: 'tiger' } as const);
    const revealed = vi.fn();
    revealScreen(
      root,
      {
        result: { promptId: 'p', timeMs: 1, match },
        animal: null,
        points: 0,
        timing,
        isLast: false,
        focusNext: false,
      },
      { revealed, next: () => {} },
    );
    const phase = () => root.querySelector('.reveal')!.className.replace(/card reveal /, '');
    return { phase, revealed, root };
  };

  it('rolls the drums, pops the badge, then shows the name', () => {
    vi.useFakeTimers();
    try {
      const r = reveal(4); // 600 + 4 x 150 = 1200 ms of build-up
      expect(r.phase()).toBe('reveal--pending');
      vi.advanceTimersByTime(1_199);
      expect(r.phase()).toBe('reveal--pending');
      vi.advanceTimersByTime(1);
      expect(r.phase()).toBe('reveal--badge');
      expect(r.revealed).not.toHaveBeenCalled(); // the name isn't out yet
      vi.advanceTimersByTime(350);
      expect(r.phase()).toBe('reveal--named');
      expect(r.revealed).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    [0, 600],
    [1, 750],
    [5, 1_350],
  ] as const)('builds up longer for rarer tiers: tier %i shows its badge at %i ms', (tier, ms) => {
    vi.useFakeTimers();
    try {
      const r = reveal(tier);
      vi.advanceTimersByTime(ms - 1);
      expect(r.phase()).toBe('reveal--pending');
      vi.advanceTimersByTime(1);
      expect(r.phase()).toBe('reveal--badge');
    } finally {
      vi.useRealTimers();
    }
  });

  it('passes the badge pop time to the CSS', () => {
    vi.useFakeTimers();
    try {
      expect(reveal(1).root.querySelector('.reveal')!.getAttribute('style')).toContain(
        '--reveal-badge-ms: 420ms',
      );
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('results: team rows, answers and the party', () => {
  const tiger = { ...ANIMALS.get('tiger')!, emoji: '🐅' };
  const fox = { ...ANIMALS.get('red-fox')!, emoji: '🦊' };
  const prompt = {
    id: 'p',
    text: 'Has stripes',
    answers: [
      { animalId: 'red-fox', tier: 1 as const },
      { animalId: 'tiger', tier: 4 as const },
      { animalId: 'snow-leopard', tier: 3 as const },
    ],
  };
  const round = (animal: typeof tiger | null, tier: 0 | 1 | 4 | 5): TeamRound => ({
    prompt,
    animal,
    result: {
      promptId: 'p',
      timeMs: 1,
      match:
        animal && tier
          ? { tier, animalId: animal.id, strategy: 'exact', input: animal.display }
          : { tier: 0, animalId: null, strategy: null, input: '' },
    },
    answers: answerLines(prompt, ANIMALS, animal?.id ?? null),
  });

  it('lists every answer by points, rarest first, marking the one found', () => {
    expect(answerLines(prompt, ANIMALS, 'tiger')).toEqual([
      { name: 'Tiger', tier: 4, points: 85, picked: true },
      { name: 'Snow leopard', tier: 3, points: 50, picked: false },
      { name: 'Red fox', tier: 1, points: 10, picked: false },
    ]);
  });

  it('opens each row to show every answer and its points, with no pictures', () => {
    const { el } = teamCard([round(tiger, 4)]);
    const details = el.querySelector('details')!;
    expect(details.open).toBe(false);
    expect(details.querySelector('summary')?.textContent).toContain('Tiger');
    const lines = [...details.querySelectorAll('.answer-line')].map((li) => li.textContent);
    expect(lines).toEqual(['Tiger85 (your answer)', 'Snow leopard50', 'Red fox10']);
    const list = details.querySelector('.team-card__answers')!;
    expect(list.querySelector('img, .portrait')).toBeNull();
    expect(list.textContent).not.toMatch(/🐅|🦊/u);
  });

  it('shows the emoji at once, then the sprite when it is ready', async () => {
    const image = { src: 'data:x', width: 24, height: 20, facesLeft: true };
    const el = portrait(tiger, false, { scale: 2, portraits: () => Promise.resolve(image) });
    expect(el.textContent).toBe('🐅');
    await Promise.resolve();
    await Promise.resolve();
    const img = el.querySelector('img')!;
    expect([img.getAttribute('width'), img.getAttribute('height')]).toEqual(['48', '40']);
    expect(img.classList.contains('portrait__sprite--flip')).toBe(true);
  });

  it('plays the walk cycle in place when asked, from the frames strip', async () => {
    const image = {
      src: 'data:still',
      width: 24,
      height: 24,
      facesLeft: false,
      walk: { src: 'data:strip', frames: 4, fps: 8 },
    };
    const el = portrait(tiger, false, {
      scale: 2,
      portraits: () => Promise.resolve(image),
      walking: true,
    });
    await Promise.resolve();
    await Promise.resolve();
    const walk = el.querySelector<HTMLElement>('.portrait__walk')!;
    expect(walk.style.width).toBe('48px');
    expect(walk.style.backgroundImage).toContain('data:strip');
    expect(walk.style.backgroundSize).toBe('192px 48px');
    expect(walk.style.getPropertyValue('--walk-to')).toBe('-192px');
    expect(walk.style.getPropertyValue('--walk-steps')).toBe('4');
    expect(walk.style.getPropertyValue('--walk-s')).toBe('0.5s');

    const still = portrait(tiger, false, { scale: 2, portraits: () => Promise.resolve(image) });
    await Promise.resolve();
    await Promise.resolve();
    expect(still.querySelector('img')?.getAttribute('src')).toBe('data:still');
  });

  it('keeps the emoji when there is no sprite', async () => {
    const el = portrait(fox, false, { scale: 2, portraits: () => Promise.resolve(null) });
    await Promise.resolve();
    expect(el.textContent).toBe('🦊');
  });

  it('lines the party up behind the traveller, first to join nearest, misses left out', () => {
    const { el } = partyLineup([round(fox, 1), round(null, 0), round(tiger, 4)]);
    const row = el.querySelector('.party__members')!;
    expect([...row.children].map((c) => c.textContent)).toEqual(['🐅', '🦊', '🧑']);
    expect(el.getAttribute('aria-label')).toBe('You and Red fox, Tiger');
    // Each steps a little out of time with the next.
    expect([...row.children].map((c) => (c as HTMLElement).style.getPropertyValue('--i'))).toEqual([
      '0',
      '1',
      '2',
    ]);
  });
});

describe('party line-up frame', () => {
  const tiger = { ...ANIMALS.get('tiger')!, emoji: '🐅' };
  const rounds: TeamRound[] = [
    {
      prompt: { id: 'p', text: 't', answers: [] },
      animal: tiger,
      result: {
        promptId: 'p',
        timeMs: 1,
        match: { tier: 4, animalId: 'tiger', strategy: 'exact', input: 'Tiger' },
      },
      answers: [],
    },
  ];

  it("shows the biome's colours at once, at the scene's proportions", () => {
    const { el } = partyLineup(rounds, { biomeId: 'forest' });
    expect(el.style.getPropertyValue('--party-ground')).toBe('#37946e');
    expect(el.style.height).toBe('168px'); // 84 native rows x2
    expect(el.style.paddingBottom).toBe('60px'); // feet 54 rows down
  });

  it('then stands the party in the painted scenery, feet on its walk line', async () => {
    const image = { src: 'data:forest', width: 220, height: 90, groundY: 60 };
    const backdrops = vi.fn(() => Promise.resolve(image));
    const { el } = partyLineup(rounds, { biomeId: 'forest', backdrops });
    await Promise.resolve();
    await Promise.resolve();
    expect(backdrops).toHaveBeenCalledWith('forest');
    expect(el.style.backgroundImage).toContain('data:forest');
    expect(el.style.backgroundSize).toBe('440px 180px');
    expect(el.style.height).toBe('180px');
    expect(el.style.paddingBottom).toBe('60px'); // (90 - 60) x2
  });
});
