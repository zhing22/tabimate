import { describe, expect, it } from 'vitest';
import { readSheetIndex, sheetFiles } from './spriteArtSource';

describe('readSheetIndex', () => {
  it('reads the source list: each archetype at its plain paths', () => {
    const index = readSheetIndex(['bear', 'big-cat']);
    expect([...index.keys()]).toEqual(['bear', 'big-cat']);
    expect(index.get('bear')).toEqual(sheetFiles('bear'));
  });

  it("reads the build's map: each archetype at its hashed paths", () => {
    const built = {
      bear: {
        image: 'assets/sprites/bear.0123456789.png',
        json: 'assets/sprites/bear.abcdef0123.json',
      },
    };
    expect(readSheetIndex(built).get('bear')).toEqual(built.bear);
  });

  it('names the broken entry of a malformed manifest', () => {
    expect(() => readSheetIndex({ bear: { image: 'a.png' } })).toThrow('bear.json');
    expect(() => readSheetIndex({ bear: 'bear.png' })).toThrow('bear');
    expect(() => readSheetIndex(['bear', 3])).toThrow('[1]');
    expect(() => readSheetIndex('bear')).toThrow('manifest.json');
  });
});
