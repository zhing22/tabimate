// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { INSTANT_REVEAL } from '@/config/game';
import { LEVELS } from '@/config/levels';
import { BACKDROP, BACKDROP_GROUND_Y, BACKDROP_HEIGHT } from '@/config/render';
import { THEMES } from '@/config/themes';
import { ANIMALS } from '@/core/matcher/testFixtures';
import { countdown } from './components/countdown';
import { partyLineup } from './components/partyLineup';
import { portrait } from './components/portrait';
import { teamCard, type TeamRound } from './components/teamCard';
import { answerLines } from './resultsProps';
import { levelBadge } from './components/levelBadge';
import { timerRing } from './components/timerRing';
import { formatCountdown, secondsLeft } from './format';
import { revealScreen } from './screens/reveal';
import { startScreen } from './screens/start';
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

describe('levelBadge and teamCard', () => {
  it('labels the level and colours it from the tokens', () => {
    const { el } = levelBadge(3);
    expect(el.textContent).toBe('VU · Vulnerable');
    expect(el.getAttribute('style')).toContain('var(--level-3)');
    expect(levelBadge(0).el.textContent).toBe('No match');
  });

  it('compact badges show the code but keep the full name for screen readers', () => {
    const { el } = levelBadge(5, { compact: true });
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
          match: { level: 0, animalId: null, strategy: null, input: '' },
        },
      },
    ]);
    expect(el.querySelectorAll('li')).toHaveLength(1);
    expect(el.textContent).toContain('No match');
    expect(el.textContent).toContain('Lays eggs');
  });
});

describe('revealScreen', () => {
  it.each(LEVELS.map((t) => [t.id, t.effectId] as const))(
    'level %i carries its effect %s from LEVELS',
    (level, effect) => {
      const root = document.createElement('div');
      const match =
        level === 0
          ? ({ level, animalId: null, strategy: null, input: 'x' } as const)
          : ({ level, animalId: 'tiger', strategy: 'exact', input: 'x' } as const);
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
      expect(card.getAttribute('style')).toContain(`var(--level-${level})`);
    },
  );
});

describe('revealScreen beats', () => {
  const timing = {
    suspenseMs: 600,
    perLevelMs: 150,
    badgePopMs: 420,
    nameDelayMs: 350,
    jackpotFreezeMs: 500,
    countUpMs: 0,
  };
  const reveal = (level: 0 | 1 | 4 | 5) => {
    const root = document.createElement('div');
    const match =
      level === 0
        ? ({ level, animalId: null, strategy: null, input: '' } as const)
        : ({ level, animalId: 'tiger', strategy: 'exact', input: 'tiger' } as const);
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
  ] as const)(
    'builds up longer for rarer levels: level %i shows its badge at %i ms',
    (level, ms) => {
      vi.useFakeTimers();
      try {
        const r = reveal(level);
        vi.advanceTimersByTime(ms - 1);
        expect(r.phase()).toBe('reveal--pending');
        vi.advanceTimersByTime(1);
        expect(r.phase()).toBe('reveal--badge');
      } finally {
        vi.useRealTimers();
      }
    },
  );

  it('holds a top-level find for the jackpot freeze, then flashes gold with the name', () => {
    vi.useFakeTimers();
    try {
      const r = reveal(5); // badge at 1350 ms; name 350 + 500 ms freeze later
      vi.advanceTimersByTime(1_350);
      expect(r.phase()).toBe('reveal--badge');
      vi.advanceTimersByTime(350 + 499);
      expect(r.phase()).toBe('reveal--badge'); // frozen
      vi.advanceTimersByTime(1);
      expect(r.phase()).toBe('reveal--named reveal--jackpot');
      // Any other level names after the usual delay, with no flash.
      const en = reveal(4);
      vi.advanceTimersByTime(1_200 + 350);
      expect(en.phase()).toBe('reveal--named');
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows the badge, then the extras, under the name', () => {
    vi.useFakeTimers();
    try {
      const root = document.createElement('div');
      const fact = document.createElement('p');
      fact.textContent = 'A big cat.';
      revealScreen(
        root,
        {
          result: {
            promptId: 'p',
            timeMs: 1,
            match: { level: 4, animalId: 'tiger', strategy: 'exact', input: 'tiger' },
          },
          animal: null,
          points: 85,
          timing: INSTANT_REVEAL,
          isLast: false,
          focusNext: false,
          extras: [fact],
        },
        { revealed: () => {}, next: () => {} },
      );
      const name = root.querySelector('.reveal__name')!;
      // The one level badge under the name, then the extras.
      const badge = name.nextElementSibling!;
      expect(badge.className).toBe('reveal__badge');
      expect(badge.nextElementSibling?.className).toBe('reveal__extras');
      expect(badge.nextElementSibling?.textContent).toBe('A big cat.');
      expect(root.querySelector('.reveal__points')!.textContent).toBe('+85');
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
      { animalId: 'red-fox', level: 1 as const },
      { animalId: 'tiger', level: 4 as const },
      { animalId: 'snow-leopard', level: 3 as const },
    ],
  };
  const round = (animal: typeof tiger | null, level: 0 | 1 | 4 | 5): TeamRound => ({
    prompt,
    animal,
    result: {
      promptId: 'p',
      timeMs: 1,
      match:
        animal && level
          ? { level, animalId: animal.id, strategy: 'exact', input: animal.display }
          : { level: 0, animalId: null, strategy: null, input: '' },
    },
    answers: answerLines(prompt, ANIMALS, animal?.id ?? null),
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
    // Sizes come from CSS (components.css): whole device pixels per sprite pixel.
    expect(walk.style.getPropertyValue('--fw')).toBe('24');
    expect(walk.style.getPropertyValue('--fh')).toBe('24');
    expect(walk.style.getPropertyValue('--k-default')).toBe('2');
    expect(walk.style.backgroundImage).toContain('data:strip');
    expect(walk.style.getPropertyValue('--frames')).toBe('4');
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

  it('stands the traveller in the middle: later prompts left facing right, earlier ones right facing them', () => {
    // Q1 fox, Q2 a miss, Q3 tiger: Q3 on the left; Q2 Q1 on the right (the miss left out).
    const rounds = [round(fox, 1), round(null, 0), round(tiger, 4)];
    const { el } = partyLineup(rounds);
    const [left, traveller, right] = [...el.querySelector('.party__members')!.children];
    expect(left?.textContent).toBe('🐅');
    expect(traveller?.textContent).toBe('🧑');
    expect(right?.textContent).toBe('🦊');
    expect(right?.classList.contains('party__side--face-left')).toBe(true);
    expect(left?.classList.contains('party__side--face-right')).toBe(true);
    expect(el.getAttribute('aria-label')).toBe('You and Red fox, Tiger');
    // Each steps a little out of time with the next.
    const steps = [...el.querySelectorAll<HTMLElement>('.portrait')].map((c) =>
      c.style.getPropertyValue('--i'),
    );
    expect(steps).toEqual(['0', '1', '2']);
  });

  it('puts Q7 Q6 Q5 left of the traveller and Q4 Q3 Q2 Q1 right', () => {
    const emoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣'];
    const rounds = emoji.map((e) => round({ ...fox, emoji: e }, 1));
    const row = partyLineup(rounds).el.querySelector('.party__members')!;
    expect(row.textContent).toBe('7️⃣6️⃣5️⃣🧑4️⃣3️⃣2️⃣1️⃣');
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
        match: { level: 4, animalId: 'tiger', strategy: 'exact', input: 'Tiger' },
      },
      answers: [],
    },
  ];

  it("shows the biome's colours at once, cropped like the painted scenery", () => {
    const { el } = partyLineup(rounds, { score: 160 });
    expect(el.style.getPropertyValue('--party-ground')).toBe('#37946e');
    // A high camera: the snapshot ends BACKDROP.groundBelow rows under the walk line.
    expect(el.style.height).toBe(`${BACKDROP_HEIGHT * 2}px`);
    expect(el.style.paddingBottom).toBe(`${BACKDROP.groundBelow * 2}px`);
    expect(BACKDROP_HEIGHT - BACKDROP_GROUND_Y).toBe(BACKDROP.groundBelow);
  });

  it('then stands the party in the painted scenery, feet on its walk line', async () => {
    const image = { src: 'data:forest', width: 220, height: 90, groundY: 60 };
    const backdrops = vi.fn(() => Promise.resolve(image));
    const { el } = partyLineup(rounds, { score: 160, backdrops });
    await Promise.resolve();
    await Promise.resolve();
    expect(backdrops).toHaveBeenCalledWith(160);
    expect(el.style.backgroundImage).toContain('data:forest');
    expect(el.style.backgroundSize).toBe('440px 180px');
    expect(el.style.height).toBe('180px');
    expect(el.style.paddingBottom).toBe('60px'); // (90 - 60) x2
  });
});

describe('startScreen', () => {
  it('explains scoring from LEVELS, without claiming real conservation status', () => {
    const root = document.createElement('div');
    startScreen(
      root,
      {
        puzzleNumber: 1,
        promptCount: 7,
        streak: 0,
        savedByFreeze: false,
        freezeReady: false,
        theme: null,
      },
      { play: () => {}, journal: () => {}, achievements: () => {}, history: () => {} },
    );
    const text = root.textContent ?? '';
    expect(text).toContain('from LC (10) up to CR (100)');
    expect(text).not.toMatch(/IUCN|Red List/);
    expect(root.querySelector('.theme')).toBeNull(); // a plain day shows no theme
  });

  it("shows the day's theme and its tagline", () => {
    const root = document.createElement('div');
    const fishy = THEMES.find((t) => t.id === 'fishy-friday')!;
    startScreen(
      root,
      {
        puzzleNumber: 31,
        promptCount: 7,
        streak: 0,
        savedByFreeze: false,
        freezeReady: false,
        theme: fishy,
      },
      { play: () => {}, journal: () => {}, achievements: () => {}, history: () => {} },
    );
    expect(root.querySelector('.theme-chip')?.textContent).toBe('Fishy Friday · Puzzle #31');
    expect(root.querySelector('.subtitle')?.textContent).toBe(fishy.tagline);
  });
});
