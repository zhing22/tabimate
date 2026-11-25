import { describe, expect, it, vi } from 'vitest';
import { TEMPLATE_KEYS, type Palette } from '@/config/render';
import { ANIMALS } from '@/core/matcher/testFixtures';
import type { Animal } from '@/core/types';
import { hexToRgb } from './paletteUtils';
import type { Pixels } from './recolor';
import { parseAsepriteSheet } from './sheet';
import type { LoadedSheet, PixelArt } from './sheetImages';
import { createStillPortraits } from './stillPortraits';

const TIGER: Animal = { ...ANIMALS.get('tiger')!, archetype: 'big-cat', movement: 'land' };
const EAGLE: Animal = { ...TIGER, id: 'eagle', archetype: 'raptor', movement: 'sky' };
const CATS: Animal = { ...TIGER, id: 'cats', kind: 'group', representative: 'tiger' };
const KOALA: Animal = { ...TIGER, id: 'koala', archetype: 'marsupial' };
const lookup = new Map([TIGER, EAGLE, CATS, KOALA].map((a) => [a.id, a]));

const PALETTE: Palette = ['#111111', '#cc2200', '#881100', '#ff6644', '#330000', '#ffffff'];

/** One base pixel per frame: walk is frame 0, flap frame 1. */
const SHEET: LoadedSheet = {
  info: parseAsepriteSheet({
    frames: [{ frame: { x: 0, y: 0, w: 1, h: 1 } }, { frame: { x: 1, y: 0, w: 1, h: 1 } }],
    meta: {
      frameTags: [
        { name: 'walk', from: 0, to: 0 },
        { name: 'flap', from: 1, to: 1 },
      ],
    },
  }),
  pixels: {
    width: 2,
    height: 1,
    data: new Uint8ClampedArray([
      ...hexToRgb(TEMPLATE_KEYS[1]),
      255,
      ...hexToRgb(TEMPLATE_KEYS[1]),
      255,
    ]),
  },
};

function setup(art: Partial<PixelArt> = {}) {
  const loadSheet = vi.fn(() => Promise.resolve(SHEET));
  const seen: { pixels: Pixels; tag: string }[] = [];
  const portraits = createStillPortraits({
    animals: lookup,
    loadArt: () =>
      Promise.resolve({
        palettes: new Map([['tiger', PALETTE]]),
        animals: new Map(['tiger', 'eagle', 'koala'].map((id) => [id, { palette: 'tiger' }])),
        sheets: ['big-cat', 'raptor'],
        ...art,
      }),
    loadSheet,
    toPortrait: (pixels, _sheet, tag) => {
      seen.push({ pixels, tag });
      return { src: `still:${seen.length}`, width: 1, height: 1, facesLeft: false };
    },
  });
  return { portraits, loadSheet, seen };
}

const baseOf = (pixels: Pixels) => [...pixels.data.slice(0, 3)];

describe('createStillPortraits', () => {
  it('recolours the sheet for any animal, once, and plays how it moves', async () => {
    const { portraits, loadSheet, seen } = setup();
    const tiger = await portraits(TIGER, false);
    expect(await portraits(TIGER, false)).toBe(tiger);
    await portraits(EAGLE, false);
    expect(loadSheet).toHaveBeenCalledTimes(2);
    expect(seen.map((s) => s.tag)).toEqual(['walk', 'flap']);
    expect(baseOf(seen[0]!.pixels)).toEqual(hexToRgb(PALETTE[1]));
  });

  it('draws a group as its representative, in plainer colours', async () => {
    const { portraits, seen } = setup();
    expect(await portraits(CATS, false)).not.toBeNull();
    expect(baseOf(seen[0]!.pixels)).not.toEqual(hexToRgb(PALETTE[1]));
  });

  it('draws the traveller for null, once', async () => {
    const still = { src: 'data:player', width: 16, height: 24, facesLeft: false };
    const player = vi.fn(() => still);
    const portraits = createStillPortraits({
      animals: lookup,
      loadArt: () => Promise.reject(new Error('unused')),
      loadSheet: () => Promise.resolve(SHEET),
      player,
    });
    expect(await portraits(null, false)).toBe(still);
    expect(await portraits(null, true)).toBe(still);
    expect(player).toHaveBeenCalledOnce();
  });

  it('gives null (the emoji) without a sheet or colours, or no canvas for the traveller', async () => {
    const { portraits } = setup();
    expect(await portraits(KOALA, false)).toBeNull();
    expect(await portraits(null, false)).toBeNull(); // jsdom has no 2D canvas
    const noColours = setup({ animals: new Map() });
    expect(await noColours.portraits(TIGER, false)).toBeNull();
  });

  it('gives null, warning once, when the art fails to load', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const portraits = createStillPortraits({
      animals: lookup,
      loadArt: () => Promise.reject(new Error('offline')),
      loadSheet: () => Promise.resolve(SHEET),
    });
    expect(await portraits(TIGER, false)).toBeNull();
    expect(await portraits(EAGLE, false)).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
