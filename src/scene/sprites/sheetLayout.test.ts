import { describe, expect, it } from 'vitest';
import { parseAsepriteSheet } from './sheet';
import { untrimmed } from './sheetLayout';

/** A trimmed export: 2 frames of a 16x16 box, the pixels cut down and placed by spriteSourceSize. */
const trimmed = {
  frames: [
    {
      frame: { x: 0, y: 0, w: 10, h: 12 },
      spriteSourceSize: { x: 3, y: 4, w: 10, h: 12 },
      sourceSize: { w: 16, h: 16 },
      duration: 100,
    },
    {
      frame: { x: 10, y: 0, w: 8, h: 13 },
      spriteSourceSize: { x: 4, y: 3, w: 8, h: 13 },
      sourceSize: { w: 16, h: 16 },
      duration: 100,
    },
  ],
  meta: { frameTags: [{ name: 'walk', from: 0, to: 1 }] },
};

describe('trimmed Aseprite sheets', () => {
  it('reads each frame offset and the untrimmed box as the frame size', () => {
    const info = parseAsepriteSheet(trimmed, { width: 18, height: 13 });
    expect(info).toMatchObject({ frameWidth: 16, frameHeight: 16 });
    expect(info.offsets).toEqual([
      { x: 3, y: 4 },
      { x: 4, y: 3 },
    ]);
  });

  it('lays every frame out in its full box, pixels at their offset', () => {
    const layout = untrimmed(parseAsepriteSheet(trimmed))!;
    expect(layout.info.frames).toEqual([
      { x: 0, y: 0, w: 16, h: 16 },
      { x: 16, y: 0, w: 16, h: 16 },
    ]);
    expect(layout.copies.map(({ toX, toY }) => [toX, toY])).toEqual([
      [3, 4],
      [20, 3],
    ]);
  });

  it('leaves an untrimmed sheet as it is', () => {
    const plain = {
      frames: [{ frame: { x: 0, y: 0, w: 24, h: 24 } }, { frame: { x: 24, y: 0, w: 24, h: 24 } }],
    };
    expect(untrimmed(parseAsepriteSheet(plain))).toBeNull();
  });

  it('refuses a frame placed outside its box', () => {
    const bad = structuredClone(trimmed);
    bad.frames[0]!.spriteSourceSize.x = 9;
    expect(() => parseAsepriteSheet(bad)).toThrow(/outside its 16x16 source box/);
  });
});
