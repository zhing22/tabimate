import { describe, expect, it, vi } from 'vitest';
import { BIOMES } from '@/config/biomes';
import { ANIMALS } from '@/core/matcher/testFixtures';
import type { RoundResult } from '@/core/types';
import { buildShareText, MISS_EMOJI, share, shareCard, type ShareEnvironment } from './share';
import { shareImageFile, shareImageName } from './shareImage';

const hit = (animalId: string, level: 1 | 2 | 3 | 4 | 5): RoundResult => ({
  promptId: 'p',
  timeMs: 1,
  match: { level, animalId, strategy: 'exact', input: animalId },
});
const timeUp: RoundResult = {
  promptId: 'p',
  timeMs: 25_000,
  match: { level: 0, animalId: null, strategy: null, input: '' },
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
  it('writes the title, level squares with points, animal emoji and the link', () => {
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

  it("names the day's theme in the title on a themed day", () => {
    const text = buildShareText(
      { results: [hit('tiger', 4)], animals },
      31,
      forest,
      'https://tabimate.example/',
      'Fishy Friday',
    );
    expect(text.split('\n')[0]).toBe('Tabimate #31 · Fishy Friday 🌲 Forest');
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
      theme: null,
      biome: { name: 'Forest', emoji: '🌲' },
      levels: [5, 0],
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

describe('shareCard: animals', () => {
  it('shows a paw for an animal the registry does not have', () => {
    const card = shareCard({ results: [hit('mystery-beast', 3)], animals }, 1, forest);
    expect(card.animalEmoji).toEqual(['🐾']);
  });
});

describe('share: no clipboard API', () => {
  // Browsers only offer navigator.clipboard on secure pages; a phone opening
  // the dev server over the LAN (plain http) has none.
  it('copies by hand when navigator.clipboard is missing', async () => {
    const copyByHand = vi.fn(() => true);
    const env: ShareEnvironment = { navigator: {}, preferSheet: false, copyByHand };
    expect(await share('hi', env)).toBe('copied');
    expect(copyByHand).toHaveBeenCalledWith('hi');
  });

  it('fails cleanly with neither', async () => {
    expect(await share('hi', { navigator: {}, preferSheet: false })).toBe('failed');
  });
});

describe('share with the team image', () => {
  const png = shareImageFile(new Blob(['png'], { type: 'image/png' }), 31);
  const sheet = (canShare: boolean) => {
    const shareFn = vi.fn((data?: ShareData) => Promise.resolve(void data));
    const env: ShareEnvironment = {
      navigator: { share: shareFn, canShare: () => canShare },
      preferSheet: true,
    };
    return { env, shareFn };
  };

  it('attaches the image as a PNG file where the sheet takes files', async () => {
    const { env, shareFn } = sheet(true);
    expect(await share('hi', env, () => png)).toBe('shared');
    const data = shareFn.mock.calls[0]?.[0];
    expect(data?.text).toBe('hi');
    expect(data?.files?.[0]?.name).toBe(shareImageName(31));
    expect(data?.files?.[0]?.type).toBe('image/png');
  });

  it('shares the text alone where files are not supported, or the image is not ready yet', async () => {
    const noFiles = sheet(false);
    await share('hi', noFiles.env, () => png);
    expect(noFiles.shareFn).toHaveBeenCalledWith({ text: 'hi' });
    const notReady = sheet(true);
    await share('hi', notReady.env, () => null);
    expect(notReady.shareFn).toHaveBeenCalledWith({ text: 'hi' });
  });
});
