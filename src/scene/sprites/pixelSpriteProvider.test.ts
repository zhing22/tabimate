import type { KAPLAYCtx } from 'kaplay';
import { describe, expect, it, vi } from 'vitest';
import { TEMPLATE_KEYS, type AnimalArt, type Palette } from '@/config/render';
import { ANIMALS } from '@/core/matcher/testFixtures';
import type { Animal } from '@/core/types';
import { hexToRgb } from './paletteUtils';
import { createPixelSpriteProvider, type LoadedSheet, type PixelArt } from './pixelSpriteProvider';
import type { Pixels } from './recolor';
import { parseAsepriteSheet } from './sheet';
import type { SpriteProvider } from './spriteProvider';

const cat = (id: string): Animal => ({ ...ANIMALS.get('tiger')!, id, archetype: 'big-cat' });
const TIGER = cat('tiger');
const LEOPARD = cat('snow-leopard');
const KOALA: Animal = { ...ANIMALS.get('platypus')!, id: 'koala', archetype: 'marsupial' };

const PALETTE: Palette = ['#111111', '#222222', '#333333', '#444444', '#555555', '#666666'];
const SHINY: Palette = ['#aaaaaa', '#bbbbbb', '#cccccc', '#dddddd', '#eeeeee', '#ffffff'];

/** Two 1x1 frames: a base pixel and an eye pixel. */
const SHEET: LoadedSheet = {
  info: parseAsepriteSheet({
    frames: [{ frame: { x: 0, y: 0, w: 1, h: 1 } }, { frame: { x: 1, y: 0, w: 1, h: 1 } }],
    meta: { frameTags: [{ name: 'walk', from: 0, to: 1 }] },
  }),
  pixels: {
    width: 2,
    height: 1,
    data: new Uint8ClampedArray([
      ...hexToRgb(TEMPLATE_KEYS[1]),
      255,
      ...hexToRgb(TEMPLATE_KEYS[5]),
      255,
    ]),
  },
};

function setup(
  overrides: { art?: Partial<PixelArt>; artFails?: boolean; sheetFails?: boolean } = {},
) {
  const loaded = new Map<string, { pixels: Pixels; opt: unknown }>();
  const k = {
    loadSprite: vi.fn((name: string, pixels: Pixels, opt: unknown) => {
      loaded.set(name, { pixels, opt });
      const asset = { onLoad: (cb: () => void) => (cb(), asset), onError: () => asset };
      return asset;
    }),
    quad: (x: number, y: number, w: number, h: number) => ({ x, y, w, h }),
  } as unknown as KAPLAYCtx;
  const art: PixelArt = {
    palettes: new Map([
      ['cat', PALETTE],
      ['cat-shiny', SHINY],
    ]),
    animals: new Map<string, AnimalArt>([
      ['tiger', { palette: 'cat', shinyPalette: 'cat-shiny' }],
      ['snow-leopard', { palette: 'cat' }],
      ['koala', { palette: 'cat' }],
    ]),
    sheets: ['big-cat'],
    ...overrides.art,
  };
  const fallbackLoad = vi.fn(() => Promise.resolve());
  const fallback: SpriteProvider = {
    load: fallbackLoad,
    spriteFor: (animal, shiny) => ({
      name: `emoji/${animal.id}${shiny ? '/shiny' : ''}`,
      facesLeft: true,
    }),
    playerSprite: () => ({ name: 'player', facesLeft: false }),
    portrait: (animal) => ({
      src: `emoji:${animal?.id ?? 'player'}`,
      width: 26,
      height: 26,
      facesLeft: true,
    }),
  };
  const loadSheet = vi.fn((archetype: string) =>
    overrides.sheetFails ? Promise.reject(new Error(`no ${archetype}`)) : Promise.resolve(SHEET),
  );
  const provider = createPixelSpriteProvider(k, {
    loadArt: () =>
      overrides.artFails ? Promise.reject(new Error('offline')) : Promise.resolve(art),
    loadSheet,
    fallback,
    toImage: (pixels) => pixels as unknown as HTMLCanvasElement,
    toPortrait: (_pixels, frame) => ({
      src: `pixel:${frame.x},${frame.y}`,
      width: frame.w,
      height: frame.h,
      facesLeft: false,
    }),
  });
  return { provider, loaded, loadSheet, fallbackLoad };
}

const quiet = () => vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('createPixelSpriteProvider', () => {
  it('recolours one sheet per animal, shiny and blink included, with its walk tag', async () => {
    const { provider, loaded, loadSheet } = setup();
    await provider.load([TIGER, LEOPARD]);
    expect(loadSheet).toHaveBeenCalledTimes(1); // the sheet is loaded once for both cats
    const tiger = provider.spriteFor(TIGER, false);
    expect(tiger).toEqual({
      name: 'pixel/tiger',
      blinkName: 'pixel/tiger/blink',
      facesLeft: false,
      walk: SHEET.info.tags.walk,
    });
    const px = (name: string, i: number) =>
      Array.from(loaded.get(name)!.pixels.data.slice(i * 4, i * 4 + 3));
    expect(px('pixel/tiger', 0)).toEqual(hexToRgb(PALETTE[1])); // base
    expect(px('pixel/tiger', 1)).toEqual(hexToRgb(PALETTE[5])); // eye
    expect(px('pixel/tiger/blink', 1)).toEqual(hexToRgb(PALETTE[1])); // eye closed
    expect(px('pixel/tiger/shiny', 0)).toEqual(hexToRgb(SHINY[1]));
    expect(loaded.get('pixel/tiger')!.opt).toMatchObject({
      anims: { walk: { from: 0, to: 1, loop: true } },
    });
  });

  it('uses the normal palette for shiny when an animal has no shiny palette', async () => {
    const { provider, loaded } = setup();
    await provider.load([LEOPARD]);
    expect(provider.spriteFor(LEOPARD, true).name).toBe('pixel/snow-leopard/shiny');
    expect(Array.from(loaded.get('pixel/snow-leopard/shiny')!.pixels.data.slice(0, 3))).toEqual(
      hexToRgb(PALETTE[1]),
    );
  });

  it('draws an archetype that is not in the manifest as emoji', async () => {
    const { provider, loadSheet } = setup();
    await provider.load([KOALA]);
    expect(loadSheet).not.toHaveBeenCalled();
    expect(provider.spriteFor(KOALA, false).name).toBe('emoji/koala');
  });

  it('draws an animal without colours, or whose palette is missing, as emoji', async () => {
    const { provider } = setup({
      art: { animals: new Map([['tiger', { palette: 'cat', shinyPalette: 'gone' }]]) },
    });
    await provider.load([TIGER, LEOPARD]);
    expect(provider.spriteFor(LEOPARD, false).name).toBe('emoji/snow-leopard'); // no colours
    expect(provider.spriteFor(TIGER, true).name).toBe('emoji/tiger/shiny'); // shiny palette gone
  });

  it('falls back to emoji for everything when the colours fail to load', async () => {
    const warn = quiet();
    const { provider, loadSheet, fallbackLoad } = setup({ artFails: true });
    await provider.load([TIGER]);
    expect(fallbackLoad).toHaveBeenCalled();
    expect(loadSheet).not.toHaveBeenCalled();
    expect(provider.spriteFor(TIGER, false).name).toBe('emoji/tiger');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('falls back to emoji for an archetype whose sheet fails to load', async () => {
    const warn = quiet();
    const { provider } = setup({ sheetFails: true });
    await provider.load([TIGER, LEOPARD]);
    expect(provider.spriteFor(TIGER, false).name).toBe('emoji/tiger');
    expect(warn).toHaveBeenCalledTimes(1); // once per sheet, not per animal
    warn.mockRestore();
  });

  it('leaves the player to the fallback', async () => {
    const { provider } = setup();
    await provider.load([]);
    expect(provider.playerSprite().name).toBe('player');
  });
});

describe('createPixelSpriteProvider: portraits', () => {
  it('gives the first frame of a recoloured sprite, the same object each time', async () => {
    const { provider } = setup();
    await provider.load([TIGER]);
    const still = provider.portrait(TIGER, false);
    expect(still).toEqual({ src: 'pixel:0,0', width: 1, height: 1, facesLeft: false });
    expect(provider.portrait(TIGER, false)).toBe(still);
  });

  it("leaves the player and sheetless animals to the fallback's pictures", async () => {
    const { provider } = setup();
    await provider.load([KOALA]);
    expect(provider.portrait(null, false)?.src).toBe('emoji:player');
    expect(provider.portrait(KOALA, false)?.src).toBe('emoji:koala');
  });
});
