import { describe, expect, it } from 'vitest';
import { TEMPLATE_KEYS, type AnimalArt, type Palette } from '@/config/render';
import {
  blinkPalette,
  contrastRatio,
  deriveShades,
  hexToRgb,
  resolvePalette,
  snapToPalette,
} from './paletteUtils';
import { recolor, type Pixels } from './recolor';
import { frameAt, parseAsepriteSheet } from './sheet';

const TIGER: Palette = ['#2b1d14', '#e07a24', '#a8501a', '#f6c27a', '#2b1d14', '#e8d84a'];
const WHITE: Palette = ['#2b1d14', '#f2efe6', '#c9c3b4', '#ffffff', '#3a3a4a', '#4aa3e8'];
const palettes = new Map<string, Palette>([
  ['tiger', TIGER],
  ['white-tiger', WHITE],
]);

/** A tiny sheet: one pixel of each key, one transparent, one stray colour. */
function tinySheet(): Pixels {
  const colours = [...TEMPLATE_KEYS, '#123456'];
  const data = new Uint8ClampedArray((colours.length + 1) * 4);
  colours.forEach((hex, i) => {
    data.set([...hexToRgb(hex), i === 2 ? 128 : 255], i * 4); // shadow half transparent
  });
  data.set([255, 0, 0, 0], colours.length * 4); // a key colour, fully transparent
  return { width: colours.length + 1, height: 1, data };
}

const pixel = (p: Pixels, i: number) => Array.from(p.data.slice(i * 4, i * 4 + 4));

describe('recolor', () => {
  it('swaps each key for its palette slot, keeps alpha, reports strays', () => {
    const source = tinySheet();
    const { pixels, unknown } = recolor(source, TEMPLATE_KEYS, TIGER);
    TIGER.forEach((hex, slot) => {
      expect(pixel(pixels, slot)).toEqual([...hexToRgb(hex), slot === 2 ? 128 : 255]);
    });
    expect(pixel(pixels, 6)).toEqual([0x12, 0x34, 0x56, 255]); // left as it was
    expect(pixel(pixels, 7)).toEqual([255, 0, 0, 0]); // transparent: untouched
    expect(unknown).toEqual(['#123456']);
  });

  it('returns a new image, leaving the sheet as it was', () => {
    const source = tinySheet();
    const before = Array.from(source.data);
    recolor(source, TEMPLATE_KEYS, TIGER);
    expect(Array.from(source.data)).toEqual(before);
  });
});

describe('resolvePalette', () => {
  const tiger: AnimalArt = { palette: 'tiger', shinyPalette: 'white-tiger' };

  it('uses the shiny palette when shiny', () => {
    expect(resolvePalette(tiger, false, palettes)).toEqual(TIGER);
    expect(resolvePalette(tiger, true, palettes)).toEqual(WHITE);
  });

  it('applies overrides to the normal colours only', () => {
    const art: AnimalArt = { ...tiger, paletteOverride: { 5: '#3a7d44' } };
    expect(resolvePalette(art, false, palettes)?.[5]).toBe('#3a7d44');
    expect(resolvePalette(art, false, palettes)?.[1]).toBe(TIGER[1]);
    expect(resolvePalette(art, true, palettes)).toEqual(WHITE);
  });

  it('falls back to the normal palette without a shiny one; null if missing', () => {
    expect(resolvePalette({ palette: 'tiger' }, true, palettes)).toEqual(TIGER);
    expect(resolvePalette({ palette: 'nope' }, false, palettes)).toBeNull();
  });

  it('closes the eyes for a blink by painting slot 5 in the base colour', () => {
    expect(blinkPalette(TIGER)[5]).toBe(TIGER[1]);
    expect(blinkPalette(TIGER).slice(0, 5)).toEqual(TIGER.slice(0, 5));
  });
});

describe('deriveShades', () => {
  it('makes a darker shadow and a lighter highlight', () => {
    const lum = (hex: string) => contrastRatio(hex, '#000000');
    for (const base of ['#e07a24', '#3a7d44', '#5b6ee1', '#808080'] as const) {
      const { shadow, highlight } = deriveShades(base);
      expect(lum(shadow)).toBeLessThan(lum(base));
      expect(lum(highlight)).toBeGreaterThan(lum(base));
    }
  });

  it('keeps grey grey', () => {
    const { shadow } = deriveShades('#808080');
    const [r, g, b] = hexToRgb(shadow);
    expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThanOrEqual(1);
  });
});

describe('snapToPalette and contrastRatio', () => {
  it('snaps to the nearest master colour', () => {
    const master = ['#000000', '#ffffff', '#e43b44', '#0099db'] as const;
    expect(snapToPalette('#f04040', master)).toBe('#e43b44');
    expect(snapToPalette('#101010', master)).toBe('#000000');
    expect(snapToPalette('#00a0e0', master)).toBe('#0099db');
  });

  it('measures WCAG contrast', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1);
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21); // order doesn't matter
  });
});

describe('parseAsepriteSheet', () => {
  const frame = (x: number, duration = 100) => ({ frame: { x, y: 0, w: 24, h: 24 }, duration });

  it('reads hash or array frames, and tags with their speed', () => {
    const json = {
      frames: {
        'cat 0.aseprite': frame(0),
        'cat 1.aseprite': frame(24),
        'cat 2.aseprite': frame(48, 200),
      },
      meta: { frameTags: [{ name: 'walk', from: 0, to: 1, direction: 'forward' }] },
    };
    const sheet = parseAsepriteSheet(json);
    expect(sheet.frames.map((f) => f.x)).toEqual([0, 24, 48]);
    expect(sheet).toMatchObject({ frameWidth: 24, frameHeight: 24 });
    expect(sheet.tags.walk).toEqual({ from: 0, to: 1, fps: 10 });
    expect(parseAsepriteSheet({ frames: [frame(0)] }).frames).toHaveLength(1);
  });

  it.each([
    ['no frames', { frames: [] }],
    ['mixed sizes', { frames: [frame(0), { frame: { x: 0, y: 0, w: 16, h: 16 } }] }],
    [
      'a tag past the end',
      { frames: [frame(0)], meta: { frameTags: [{ name: 'walk', from: 0, to: 3 }] } },
    ],
  ])('rejects %s', (_name, json) => {
    expect(() => parseAsepriteSheet(json)).toThrow();
  });

  it.each([
    ['pingpong', 'plays "pingpong"; only forward is supported'],
    ['reverse', 'plays "reverse"; only forward is supported'],
  ])('rejects a %s tag rather than playing it wrong', (direction, message) => {
    const json = {
      frames: [frame(0)],
      meta: { frameTags: [{ name: 'walk', from: 0, to: 0, direction }] },
    };
    expect(() => parseAsepriteSheet(json)).toThrow(message);
  });

  it('rejects a frame outside the image', () => {
    const json = { frames: [frame(0), frame(24)] };
    expect(() => parseAsepriteSheet(json, { width: 48, height: 24 })).not.toThrow();
    expect(() => parseAsepriteSheet(json, { width: 40, height: 24 })).toThrow(
      'frame 1 lies outside the 40x24 image',
    );
    expect(() => parseAsepriteSheet(json, { width: 48, height: 20 })).toThrow(
      'frame 0 lies outside',
    );
  });

  it('gives frames without a duration 125 ms (8 fps)', () => {
    const json = {
      frames: [{ frame: { x: 0, y: 0, w: 8, h: 8 } }, { frame: { x: 8, y: 0, w: 8, h: 8 } }],
      meta: { frameTags: [{ name: 'walk', from: 0, to: 1 }] },
    };
    expect(parseAsepriteSheet(json).tags.walk?.fps).toBe(8);
  });

  it.each([
    ['not an object', [], 'must be an object'],
    [
      'a frame without a rectangle',
      { frames: [{ duration: 100 }] },
      'frame 0 has no "frame" rectangle',
    ],
    [
      'a zero-size frame',
      { frames: [{ frame: { x: 0, y: 0, w: 0, h: 8 } }] },
      'frame 0 has a bad rectangle',
    ],
  ])('rejects %s, saying why', (_name, json, message) => {
    expect(() => parseAsepriteSheet(json)).toThrow(message);
  });

  it('loops a tag over time', () => {
    const walk = { from: 2, to: 5, fps: 8 };
    expect([0, 0.125, 0.25, 0.375, 0.5].map((t) => frameAt(walk, t))).toEqual([2, 3, 4, 5, 2]);
  });
});
