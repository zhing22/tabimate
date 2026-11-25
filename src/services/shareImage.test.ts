import { describe, expect, it, vi } from 'vitest';
import { SHARE_IMAGE } from '@/config/ui';
import { drawShareImage, type ShareImageInput } from './shareImage';
import { shareImageLayout } from './shareImageLayout';

describe('shareImageLayout', () => {
  it('fits seven members across the image, evenly spaced, inside its edges', () => {
    const at = shareImageLayout(7);
    expect(at.width).toBe(SHARE_IMAGE.width);
    expect(at.height).toBe(SHARE_IMAGE.height);
    expect(at.slots).toHaveLength(7);
    const gaps = at.slots.slice(1).map((x, i) => x - at.slots[i]!);
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThanOrEqual(1);
    expect(at.slots[0]).toBeGreaterThan(0);
    expect(at.slots.at(-1)).toBeLessThan(at.width);
  });

  it('keeps the text above the scene, the badges under it and the footer on the image', () => {
    const at = shareImageLayout(7);
    expect(at.text.biome).toBeLessThan(at.scene.y);
    expect(at.groundY).toBeLessThan(at.scene.y + at.scene.h);
    expect(at.badgeY).toBeGreaterThan(at.scene.y + at.scene.h);
    expect(at.text.footer).toBeLessThan(at.height);
  });
});

/** Records what is written; every other canvas call is a no-op. */
function fakeContext() {
  const texts: string[] = [];
  const images: unknown[] = [];
  const turns: number[] = [];
  const ctx = new Proxy(
    {
      fillText: (text: string) => texts.push(text),
      scale: (x: number) => turns.push(x),
      drawImage: (img: unknown) => images.push(img),
      createLinearGradient: () => ({ addColorStop: () => {} }),
    },
    {
      get: (target: Record<string, unknown>, key: string) => target[key] ?? (() => {}),
      set: () => true,
    },
  ) as unknown as CanvasRenderingContext2D;
  return { ctx, texts, images, turns };
}

const input: ShareImageInput = {
  title: 'Tabimate #31 · Fishy Friday',
  subtitle: '20 Nov 2026',
  score: 185,
  biome: '🌲 Forest',
  sky: ['#5fa8c8', '#cfe8d0'],
  ground: '#37946e',
  ink: '#2b2134',
  backdrop: { src: 'data:scene', width: 220, height: 84, groundY: 72 },
  members: [
    {
      picture: { src: 'data:tiger', width: 24, height: 24, facesLeft: true },
      emoji: '🐅',
      badge: { text: 'EN', colour: '#7b3fbf', ink: '#fff' },
    },
    { picture: null, emoji: '🦊', badge: { text: 'LC', colour: '#e9e4d8', ink: '#2b2134' } },
    { picture: null, emoji: '💨', badge: null },
  ],
  footer: 'tabimate.example',
};

describe('drawShareImage', () => {
  it('writes the title, date, score, biome, badges and link, and never an animal name', async () => {
    const { ctx, texts, images } = fakeContext();
    const load = vi.fn((src: string) => Promise.resolve(src as unknown as CanvasImageSource));
    await drawShareImage(ctx, input, load);
    expect(texts).toEqual(
      expect.arrayContaining([
        'Tabimate #31 · Fishy Friday',
        '20 Nov 2026',
        '185 points',
        '🌲 Forest',
        'EN',
        'LC',
        '🦊',
        '💨',
        'tabimate.example',
      ]),
    );
    expect(texts.join(' ')).not.toMatch(/Tiger|Fox/);
    // The scene and the one member with a sprite are drawn as images.
    expect(images).toEqual(['data:scene', 'data:tiger']);
  });

  it('turns a picture round when its member faces left (a left-facing sheet faces right)', async () => {
    const { ctx, turns } = fakeContext();
    const tiger = input.members[0]!;
    const members = [tiger, { ...tiger, facing: 'left' as const }];
    await drawShareImage(ctx, { ...input, members }, (src) =>
      Promise.resolve(src as unknown as CanvasImageSource),
    );
    expect(turns).toEqual([-1]); // facesLeft alone turns it; facesLeft and facing left cancel
  });
});
