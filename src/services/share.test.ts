import { describe, expect, it, vi } from 'vitest';
import { BIOMES } from '@/config/biomes';
import { ANIMALS } from '@/core/matcher/testFixtures';
import type { RoundResult } from '@/core/types';
import { buildShareText, MISS_EMOJI, share, shareCard, type ShareEnvironment } from './share';

const hit = (animalId: string, tier: 1 | 2 | 3 | 4 | 5): RoundResult => ({
  promptId: 'p',
  timeMs: 1,
  match: { tier, animalId, strategy: 'exact', input: animalId },
});
const timeUp: RoundResult = {
  promptId: 'p',
  timeMs: 25_000,
  match: { tier: 0, animalId: null, strategy: null, input: '' },
};

// Emoji per animal for the test, as animals.json gives them.
const animals = new Map(
  [...ANIMALS.values()].map((a) => [
    a.id,
    { ...a, emoji: { tiger: '🐅', platypus: '🦫', 'red-fox': '🦊' }[a.id] ?? '🐾' },
  ]),
);
const forest = BIOMES.find((b) => b.id === 'forest')!;

describe('buildShareText', () => {
  it('writes the title, tier squares with points, animal emoji and the link', () => {
    const text = buildShareText(
      { results: [hit('platypus', 2), hit('tiger', 4), timeUp], animals },
      12,
      forest,
      'https://tabimate.example/',
    );
    expect(text).toBe(
      [
        'Tabimate #12 🌲 Forest',
        `🟦🟪⬛  110 pts`,
        `🦫🐅${MISS_EMOJI}`,
        'https://tabimate.example/',
      ].join('\n'),
    );
  });

  it('never names the animals or the prompts', () => {
    const text = buildShareText(
      { results: [hit('red-fox', 1), hit('tiger', 4)], animals },
      3,
      forest,
      'u',
    );
    for (const word of ['fox', 'Fox', 'tiger', 'Tiger', 'Name an', 'prompt']) {
      expect(text).not.toContain(word);
    }
  });

  it('pastes cleanly: plain lines, no trailing spaces, no markup', () => {
    const text = buildShareText({ results: [hit('tiger', 5)], animals }, 1, forest, 'https://x.y/');
    for (const line of text.split('\n')) expect(line).toBe(line.trim());
    expect(text).not.toMatch(/[\r\t<>*_`]/);
    expect(text.split('\n')).toHaveLength(4);
  });
});

describe('shareCard', () => {
  it('holds the same facts as data, for an image card later', () => {
    expect(shareCard({ results: [hit('tiger', 5), timeUp], animals }, 7, forest)).toEqual({
      puzzleNumber: 7,
      biome: { name: 'Forest', emoji: '🌲' },
      tiers: [5, 0],
      animalEmoji: ['🐅', MISS_EMOJI],
      score: 100,
    });
  });
});

describe('share', () => {
  const env = (
    over: Partial<ShareEnvironment['navigator']>,
    preferSheet: boolean,
    copyByHand = () => false,
  ) => {
    const writeText = vi.fn(() => Promise.resolve());
    const navigator = { clipboard: { writeText } as unknown as Clipboard, ...over };
    return { env: { navigator, preferSheet, copyByHand } as ShareEnvironment, writeText };
  };

  it('uses the share sheet on phones', async () => {
    const shareFn = vi.fn(() => Promise.resolve());
    const { env: e, writeText } = env({ share: shareFn }, true);
    expect(await share('hi', e)).toBe('shared');
    expect(shareFn).toHaveBeenCalledWith({ text: 'hi' });
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies on desktops, even where a share sheet exists', async () => {
    const shareFn = vi.fn(() => Promise.resolve());
    const { env: e, writeText } = env({ share: shareFn }, false);
    expect(await share('hi', e)).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('hi');
    expect(shareFn).not.toHaveBeenCalled();
  });

  it('says cancelled, and copies nothing, when the sheet is dismissed', async () => {
    const abort = Object.assign(new Error('dismissed'), { name: 'AbortError' });
    const { env: e, writeText } = env({ share: () => Promise.reject(abort) }, true);
    expect(await share('hi', e)).toBe('cancelled');
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies instead when the sheet fails for another reason', async () => {
    const denied = Object.assign(new Error('nope'), { name: 'NotAllowedError' });
    const { env: e } = env({ share: () => Promise.reject(denied) }, true);
    expect(await share('hi', e)).toBe('copied');
  });

  it('falls back to copying by hand, and reports failure if that fails too', async () => {
    const broken = {
      writeText: () => Promise.reject(new Error('blocked')),
    } as unknown as Clipboard;
    expect(await share('hi', env({ clipboard: broken }, false, () => true).env)).toBe('copied');
    expect(await share('hi', env({ clipboard: broken }, false, () => false).env)).toBe('failed');
  });
});
