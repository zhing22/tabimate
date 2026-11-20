import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PLACEHOLDER_ART } from '../../../src/config/placeholderArt';
import type { Movement } from '../../../src/core/types';
import { parseAsepriteSheet } from '../../../src/scene/sprites/sheet';
import { ARCHETYPES } from './archetypes';
import { createGrid, ellipse, get, line, outline, rect, shade } from './grid';
import { drawFrames, isPlaceholder, sheetJson, sheetPixels, tagsFor } from './sheet';

const animals = JSON.parse(readFileSync('public/data/animals.json', 'utf8')) as {
  archetype: string;
  movement: Movement;
}[];
// The tags each archetype's sheet will have (groups aside: they move like their species).
const tagsOf = (archetype: string) =>
  tagsFor(animals.filter((a) => a.archetype === archetype).map((a) => a.movement));

describe('grid', () => {
  it('ignores pixels off the frame and fills shapes', () => {
    const g = createGrid(8);
    rect(g, -2, -2, 1, 1, 'b');
    line(g, 0, 7, 7, 7, 'a');
    ellipse(g, 5, 3, 1, 1, 'e');
    expect(get(g, 0, 0)).toBe('b');
    expect(get(g, 7, 7)).toBe('a');
    expect(get(g, 5, 3)).toBe('e');
    expect(get(g, 3, 3)).toBe('.');
  });

  it('lights the top, shadows the underside and outlines the edge', () => {
    const g = createGrid(8);
    rect(g, 2, 2, 4, 4, 'b');
    shade(g);
    outline(g);
    expect([get(g, 3, 2), get(g, 3, 3), get(g, 3, 4)]).toEqual(['h', 'b', 's']);
    expect([get(g, 3, 1), get(g, 1, 3), get(g, 1, 1)]).toEqual(['o', 'o', '.']);
  });
});

describe('placeholder archetypes', () => {
  it('has a body plan for every archetype in animals.json', () => {
    const missing = [...new Set(animals.map((a) => a.archetype))].filter((a) => !ARCHETYPES[a]);
    expect(missing).toEqual([]);
  });

  // The outline needs a free pixel all round, so nothing is drawn on the edge.
  it.each(Object.keys(ARCHETYPES))('%s fits its frames and moves', (archetype) => {
    const frames = drawFrames(ARCHETYPES[archetype]!, tagsOf(archetype));
    const last = PLACEHOLDER_ART.size - 1;
    for (const g of frames) {
      const edge = g.cells.flatMap((row, y) =>
        row.filter(
          (k, x) => k !== '.' && k !== 'o' && (x === 0 || y === 0 || x === last || y === last),
        ),
      );
      expect(edge, `frame ${frames.indexOf(g)}`).toEqual([]);
      expect(
        g.cells.flat().filter((k) => k === 'e'),
        `frame ${frames.indexOf(g)} eye`,
      ).toHaveLength(1);
    }
    const walk = frames.slice(0, PLACEHOLDER_ART.framesPerTag).map((g) => g.cells.join());
    expect(new Set(walk).size).toBeGreaterThan(1);
  });
});

describe('placeholder sheets', () => {
  it('always walks, and adds flap for sky and swim for water', () => {
    expect(tagsFor(['land'])).toEqual(['walk']);
    expect(tagsFor(['land', 'sky'])).toEqual(['walk', 'flap']);
    expect(tagsFor(['water'])).toEqual(['walk', 'swim']);
  });

  it('writes JSON the game reads, with a tag per movement', () => {
    const json = sheetJson('penguin', ['walk', 'swim']);
    const info = parseAsepriteSheet(json);
    const n = PLACEHOLDER_ART.framesPerTag;
    expect(info.frames).toHaveLength(2 * n);
    expect(info.tags.swim).toMatchObject({ from: n, to: 2 * n - 1 });
    expect(isPlaceholder(json)).toBe(true);
    expect(isPlaceholder({ meta: { app: 'https://www.aseprite.org/' } })).toBe(false);
  });

  it('lays frames side by side in opaque template colours', () => {
    const { width, height, data } = sheetPixels(drawFrames(ARCHETYPES.canine!, ['walk']));
    expect([width, height]).toEqual([
      PLACEHOLDER_ART.size * PLACEHOLDER_ART.framesPerTag,
      PLACEHOLDER_ART.size,
    ]);
    const alphas = new Set(data.filter((_, i) => i % 4 === 3));
    expect([...alphas].sort()).toEqual([0, 255]);
  });
});
