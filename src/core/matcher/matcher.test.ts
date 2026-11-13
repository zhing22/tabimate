import { describe, expect, it } from 'vitest';
import { MATCHER_CONFIG, MAX_INPUT_LENGTH, type MatcherConfig } from '@/config/game';
import type { Animal, AnimalId, Prompt } from '../types';
import { buildCandidates } from './candidates';
import { STRATEGIES, clampInput, matchAnswer, runStrategies } from './index';
import { ANIMALS, PROMPT } from './testFixtures';

const match = (raw: string, cfg: MatcherConfig = MATCHER_CONFIG) =>
  matchAnswer(raw, PROMPT, ANIMALS, cfg);

describe('matchAnswer', () => {
  it.each([
    ['Platypus', 'platypus', 2, 'exact'],
    ['  PLATYPUS!  ', 'platypus', 2, 'exact'],
    ['killer whales', 'killer-whale', 1, 'exact'],
    ['orca', 'killer-whale', 1, 'alias'],
    ['Orcas', 'killer-whale', 1, 'alias'],
    ['platipus', 'platypus', 2, 'typo'],
    ['plat', 'platypus', 2, 'partial'],
    ['snow leo', 'snow-leopard', 3, 'partial'],
    // 3 edits away, so too far for typo, but most of its trigrams match.
    ['plaatyypuss', 'platypus', 2, 'loose'],
  ] as const)('%j -> %s (tier %i, %s)', (raw, animalId, tier, strategy) => {
    expect(match(raw)).toEqual({ tier, animalId, strategy, input: raw });
  });

  it.each(['', '   ', '!!!'])('%j is always a miss', (raw) => {
    expect(match(raw)).toEqual({ tier: 0, animalId: null, strategy: null, input: raw });
  });

  // "er" is inside "tiger" and "ar" inside "bear": fragments that short match nothing.
  it.each(['James', 'zzzz', 'er', 'an', 'ar'])('%j matches nothing', (raw) => {
    expect(match(raw)).toEqual({ tier: 0, animalId: null, strategy: null, input: raw });
  });
});

describe('lists of animals', () => {
  // Pasting a list must not beat naming one animal: no strategy may pick an
  // answer out of it, so the player is told it is not on the list.
  it.each(['platypus tiger', 'tiger, platypus, red fox', 'brown bear sun bear', 'orca tiger'])(
    '%j matches nothing',
    (raw) => {
      expect(match(raw)).toMatchObject({ tier: 0, animalId: null, strategy: null });
    },
  );

  it.each([
    ['a red fox', 'red-fox'], // one animal, with a word around it
    ['red fox fox', 'red-fox'], // its name and its alias: still one animal
    ['snow leopard', 'snow-leopard'],
  ])('%j still names one animal', (raw, id) => {
    expect(match(raw).animalId).toBe(id);
  });
});

describe('strategies', () => {
  // No random or "lucky" scoring: the default pipeline is these five, in order.
  it('are exact, alias, typo, partial and loose, and nothing else', () => {
    expect(STRATEGIES.map((s) => s.id)).toEqual(['exact', 'alias', 'typo', 'partial', 'loose']);
  });
});

describe('clampInput', () => {
  it('keeps short input as it is', () => {
    expect(clampInput('Platypus')).toBe('Platypus');
    expect(clampInput('x'.repeat(MAX_INPUT_LENGTH))).toHaveLength(MAX_INPUT_LENGTH);
  });

  it('cuts long input to MAX_INPUT_LENGTH', () => {
    expect(clampInput('x'.repeat(10_000))).toBe('x'.repeat(MAX_INPUT_LENGTH));
  });

  it('never leaves half an emoji', () => {
    // '🦊' is two UTF-16 units; a cut at 4 would land between them.
    expect(clampInput('abc🦊def', 4)).toBe('abc');
    expect(clampInput('ab🦊def', 4)).toBe('ab🦊');
  });
});

describe('long input', () => {
  it('matches on the first MAX_INPUT_LENGTH characters and stores only those', () => {
    const pasted = `platypus${' '.repeat(MAX_INPUT_LENGTH)}${'junk '.repeat(100_000)}`;
    const result = match(pasted);
    expect(result).toMatchObject({ animalId: 'platypus', strategy: 'exact' });
    expect(result.input).toHaveLength(MAX_INPUT_LENGTH);
  });
});

describe('runStrategies', () => {
  const candidates = buildCandidates(PROMPT, ANIMALS);
  const input = { text: 'orca', promptId: PROMPT.id };

  it('reports which strategy hit, with its confidence', () => {
    expect(runStrategies(input, candidates, MATCHER_CONFIG)).toEqual({
      animalId: 'killer-whale',
      tier: 1,
      strategy: 'alias',
      confidence: 1,
    });
  });

  it('uses the strategy list it is given', () => {
    expect(runStrategies(input, candidates, MATCHER_CONFIG, [])).toBeNull();
  });
});

describe('buildCandidates', () => {
  it('normalizes names, display first, and reuses the result per prompt', () => {
    const candidates = buildCandidates(PROMPT, ANIMALS);
    expect(candidates[1]?.names).toEqual(['killer whale', 'orca']);
    expect(buildCandidates(PROMPT, ANIMALS)).toBe(candidates);
  });

  it('falls back to the animal id when the registry lacks it', () => {
    const prompt: Prompt = { id: 'x', text: 'x', answers: [{ animalId: 'snow-owl', tier: 1 }] };
    expect(buildCandidates(prompt, new Map())[0]?.names).toEqual(['snow owl']);
  });
});

describe('performance', () => {
  // Syllable names give 300 distinct, plausible-looking animals.
  const SYLLABLES = ['ka', 'lo', 'mi', 'ra', 'tu', 'ven', 'shi', 'pa', 'gor', 'el', 'zu', 'qua'];
  const nameOf = (i: number) =>
    [i % 12, Math.floor(i / 12) % 12, Math.floor(i / 144) % 12, (i * 7) % 12]
      .map((s) => SYLLABLES[s])
      .join('');

  const animals = new Map<AnimalId, Animal>();
  const answers = Array.from({ length: 300 }, (_, i) => {
    const id = `a${i}`;
    animals.set(id, {
      ...ANIMALS.get('tiger')!,
      id,
      display: nameOf(i),
      aliases: [`${nameOf(i)} x`],
    });
    return { animalId: id, tier: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5 };
  });
  const prompt: Prompt = { id: 'bench', text: 'bench', answers };
  // A mix of exact names, typos, fragments and nonsense, so every strategy runs.
  const inputs = Array.from({ length: 1000 }, (_, i) => {
    const name = nameOf((i * 37) % 300);
    return [name, `${name.slice(0, -1)}q`, name.slice(0, 3), `zz${i}yy`][i % 4]!;
  });

  it('does 1000 matches against 300 candidates in under 50 ms', () => {
    // Other test files start up in parallel (jsdom is heavy), so one run can be
    // slowed by the machine, not the matcher. Up to 10 tries; a slow matcher fails all.
    let best = Number.POSITIVE_INFINITY;
    for (let attempt = 0; attempt < 10 && best >= 50; attempt++) {
      const start = performance.now();
      for (const raw of inputs) matchAnswer(raw, prompt, animals);
      best = Math.min(best, performance.now() - start);
    }
    expect(best).toBeLessThan(50);
  });
});
