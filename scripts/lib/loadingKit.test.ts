import { describe, expect, it } from 'vitest';
import { LOADING_KIT } from '../../src/config/loadingKit.ts';
import { PLAYER_COLOURS, PLAYER_WALK_FRAMES } from '../../src/scene/sprites/playerArt.ts';
import { parseAsepriteSheet } from '../../src/scene/sprites/sheet.ts';
import { kitProblem } from './bundleBudget.ts';
import { composeKit, sheetRow, textRow } from './loadingKit.ts';
import { loadingKitScript, loadingKitStyle } from '../vite/loadingKit.ts';

const alphaAt = (p: { width: number; data: Uint8ClampedArray }, x: number, y: number) =>
  p.data[(y * p.width + x) * 4 + 3];

describe('the loading kit', () => {
  it("draws the traveller's 4 walk frames bottom-centre in their cells", () => {
    expect(PLAYER_WALK_FRAMES).toHaveLength(LOADING_KIT.frames);
    for (const frame of PLAYER_WALK_FRAMES)
      expect(frame.every((row) => row.length === 16)).toBe(true);
    const kit = composeKit([textRow(PLAYER_WALK_FRAMES, PLAYER_COLOURS)], LOADING_KIT.cell, 4);
    expect([kit.width, kit.height]).toEqual([96, 24]);
    // 16 px wide in a 24 px cell: 4 px clear each side; feet on the cell's floor.
    expect(alphaAt(kit, 3, 23)).toBe(0);
    expect(alphaAt(kit, 24 + 4 + 5, 23)).toBe(255); // the long stride's back boot
  });

  it('places a sheet frame by its Aseprite offset inside its box, the box bottom-centre', () => {
    const pixels = { width: 4, height: 2, data: new Uint8ClampedArray(4 * 2 * 4).fill(255) };
    const info = parseAsepriteSheet({
      frames: [0, 1].map((i) => ({
        frame: { x: i * 2, y: 0, w: 2, h: 2 },
        spriteSourceSize: { x: 1, y: 2, w: 2, h: 2 },
        sourceSize: { w: 4, h: 4 },
      })),
      meta: { frameTags: [{ name: 'walk', from: 0, to: 1 }] },
    });
    const kit = composeKit([sheetRow(pixels, info, 'walk', 2)], { width: 6, height: 6 }, 2);
    // Box 4x4 at (1, 2) of the 6x6 cell; the frame at (1, 2) in the box: (2..3, 4..5).
    expect(alphaAt(kit, 2, 4)).toBe(255);
    expect(alphaAt(kit, 3, 5)).toBe(255);
    expect(alphaAt(kit, 1, 4)).toBe(0);
    expect(alphaAt(kit, 6 + 2, 4)).toBe(255);
  });

  it('refuses a walk with the wrong number of frames, or a frame too big for the cell', () => {
    const pixels = { width: 30, height: 30, data: new Uint8ClampedArray(30 * 30 * 4) };
    const info = parseAsepriteSheet({
      frames: [{ frame: { x: 0, y: 0, w: 30, h: 30 } }],
      meta: { frameTags: [{ name: 'walk', from: 0, to: 0 }] },
    });
    expect(() => sheetRow(pixels, info, 'walk', 4)).toThrow(/4 frames/);
    expect(() => composeKit([sheetRow(pixels, info, 'walk', 1)], LOADING_KIT.cell, 1)).toThrow(
      /fit/,
    );
  });

  it("writes CSS that steps whole frames and picks today's animal by row", () => {
    const css = loadingKitStyle(new Uint8Array([1, 2, 3]), {
      cell: { width: 24, height: 24 },
      frames: 4,
      fps: 8,
      rows: ['traveller', 'fox', 'penguin'],
    });
    expect(css).toContain('url("data:image/png;base64,AQID")');
    expect(css).toContain('steps(4)');
    expect(css).toContain('0.5s');
    expect(css).toContain('image-rendering:pixelated');
    expect(css).toContain('background-position-x:calc(-96*var(--kit-px))');
    expect(css).toContain('html[data-kit-animal="2"] .kit--animal{--kit-row:2}');
    expect(loadingKitScript(4)).toContain('Math.random()*4');
  });

  it('keeps to its budget', () => {
    expect(kitProblem(4096, 4)).toBeNull();
    expect(kitProblem(4097, 4)).toMatch(/over its 4 KB budget/);
  });
});
