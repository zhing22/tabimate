// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { AnswerLevel } from '@/config/levels';
import { ANIMALS, PROMPT } from '@/core/matcher/testFixtures';
import type { Animal, Prompt, RoundResult } from '@/core/types';
import { REVEAL_EXTRAS, revealExtras } from './extras';
import { betterChild, nearMissText } from './nearMiss';

const result = (animalId: string | null, level: AnswerLevel | 0): RoundResult => ({
  promptId: PROMPT.id,
  timeMs: 1,
  match:
    animalId === null || level === 0
      ? { level: 0, animalId: null, strategy: null, input: '' }
      : { level, animalId, strategy: 'exact', input: animalId },
});
const penguin = ANIMALS.get('penguin')!;
const tiger: Animal = { ...ANIMALS.get('tiger')!, description: 'The largest living cat.' };
const extrasFor = (r: RoundResult, animal: Animal | null, prompt: Prompt = PROMPT) =>
  revealExtras(r, { animal, prompt, animals: ANIMALS }).map((el) => el.className.split('--')[1]);

describe('betterChild', () => {
  // On PROMPT: penguin (group) 1, Emperor penguin 2, African penguin 4.
  it('finds the rarest species under the group that beats its level', () => {
    expect(betterChild(PROMPT, penguin, 1, ANIMALS)?.animal.id).toBe('african-penguin');
    expect(betterChild(PROMPT, penguin, 4, ANIMALS)).toBeNull(); // nothing beats EN here
  });

  it('never gives away the top-level (CR) answer', () => {
    const prompt: Prompt = {
      ...PROMPT,
      answers: [
        { animalId: 'penguin', level: 1 },
        { animalId: 'emperor-penguin', level: 2 },
        { animalId: 'african-penguin', level: 5 },
      ],
    };
    expect(betterChild(prompt, penguin, 1, ANIMALS)).toEqual({
      animal: ANIMALS.get('emperor-penguin'),
      level: 2,
    });
  });

  it('reads like a hint', () => {
    const child = betterChild(PROMPT, penguin, 1, ANIMALS)!;
    expect(nearMissText(penguin, 1, child)).toBe(
      'Penguin is LC (10) — African penguin would have been EN (85)',
    );
  });
});

describe('revealExtras', () => {
  it('shows them in a fixed order: jackpot, fact, near miss', () => {
    expect(REVEAL_EXTRAS.map((e) => e.id)).toEqual(['jackpot', 'factLine', 'nearMiss']);
  });

  it('gives a top-level find the jackpot banner, and every animal with a description its fact', () => {
    expect(extrasFor(result('tiger', 5), tiger)).toEqual(['jackpot', 'fact']);
    expect(extrasFor(result('tiger', 4), tiger)).toEqual(['fact']);
    const jackpot = revealExtras(result('tiger', 5), {
      animal: tiger,
      prompt: PROMPT,
      animals: ANIMALS,
    })[0]!;
    expect(jackpot.textContent).toBe('Jackpot find!');
  });

  it('gives a group answer the near-miss hint, and nothing for a miss', () => {
    expect(extrasFor(result('penguin', 1), penguin)).toEqual(['near-miss']);
    expect(extrasFor(result(null, 0), null)).toEqual([]);
    // A species never gets a near-miss hint, even with rarer answers around.
    expect(extrasFor(result('emperor-penguin', 2), ANIMALS.get('emperor-penguin')!)).toEqual([]);
  });
});
