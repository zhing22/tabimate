import { describe, expect, it } from 'vitest';
import { MATCHER_CONFIG, MAX_INPUT_LENGTH, type MatcherConfig } from '@/config/game';
import type { Animal, AnimalId, Prompt } from '../types';
import { buildCandidates } from './candidates';
import { clampInput, matchAnswer, runStrategies } from './index';
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
    const sure = { ...MATCHER_CONFIG, luckyHitChance: 1 };
    expect(match(raw, sure)).toEqual({ tier: 0, animalId: null, strategy: null, input: raw });
  });

  it.each(['A', 'James'])('%j gets the same result on every call, never tier 5', (raw) => {
    const first = match(raw);
    for (let i = 0; i < 20; i++) expect(match(raw)).toEqual(first);
    expect(first.tier).not.toBe(5);
    if (first.tier !== 0) expect(first.strategy).toBe('lucky');
  });

  it('gives a lucky non-zero tier to nonsense when lucky is certain', () => {
    const result = match('James', { ...MATCHER_CONFIG, luckyHitChance: 1 });
    expect(result.tier).toBeGreaterThan(0);
    expect(result.strategy).toBe('lucky');
  });

  it('misses nonsense when lucky is off', () => {
    expect(match('James', { ...MATCHER_CONFIG, luckyHitChance: 0 }).tier).toBe(0);
  });

  // "er" is inside "tiger" and "ar" inside "bear": short fragments must go through
  // the lucky roll like any other unrecognised guess, not win outright.
  it.each(['er', 'an', 'ar'])('%j only ever scores through lucky', (raw) => {
    expect(match(raw, { ...MATCHER_CONFIG, luckyHitChance: 0 }).tier).toBe(0);
    const result = match(raw);
    if (result.tier !== 0) expect(result.strategy).toBe('lucky');
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
    // Fastest of 3, so a busy machine (tests run in parallel) does not fail it.
    const runs = Array.from({ length: 3 }, () => {
      const start = performance.now();
      for (const raw of inputs) matchAnswer(raw, prompt, animals);
      return performance.now() - start;
    });
    expect(Math.min(...runs)).toBeLessThan(50);
  });
});
