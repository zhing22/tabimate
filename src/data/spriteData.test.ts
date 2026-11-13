import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { TEMPLATE_KEYS } from '@/config/render';
import { parseAsepriteSheet } from '@/scene/sprites/sheet';
import { validateAnimals } from './validate';
import { validateAnimalArt, validateMasterPalette, validatePalettes } from './validateArt';

// The real sprite data in public/, so a bad edit fails `npm run check`.
const read = (path: string): unknown => JSON.parse(readFileSync(`public/${path}`, 'utf8'));
const palettes = validatePalettes(read('data/palettes.json'), 'palettes.json');
const master = validateMasterPalette(read('data/master-palette.json'), 'master-palette.json');
const art = validateAnimalArt(read('data/animals.json'), 'animals.json', palettes);
const animals = validateAnimals(read('data/animals.json'), 'animals.json');
const sheets = read('assets/sprites/manifest.json') as string[];

describe('sprite data', () => {
  it('gives the big cats palettes, shiny ones included', () => {
    for (const id of ['tiger', 'snow-leopard']) {
      expect(art.get(id)?.palette, id).toBeTypeOf('string');
      expect(art.get(id)?.shinyPalette, id).toBeTypeOf('string');
    }
  });

  it('only names real animals', () => {
    for (const id of art.keys()) expect(animals.has(id), id).toBe(true);
  });

  // Art specs: every palette colour comes from one master palette.
  it('takes every palette colour from the master palette', () => {
    for (const [name, palette] of palettes) {
      for (const hex of palette) expect(master, `${name} ${hex}`).toContain(hex);
    }
  });

  it.each(sheets)(
    '%s sheet uses only the template keys and matches its JSON',
    async (archetype) => {
      const info = parseAsepriteSheet(read(`assets/sprites/${archetype}.json`));
      const { data, info: png } = await sharp(`public/assets/sprites/${archetype}.png`)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      for (const f of info.frames) {
        expect(f.x + f.w).toBeLessThanOrEqual(png.width);
        expect(f.y + f.h).toBeLessThanOrEqual(png.height);
      }
      const keys = new Set<string>(TEMPLATE_KEYS);
      const stray = new Set<string>();
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        const hex = `#${[data[i]!, data[i + 1]!, data[i + 2]!].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
        if (!keys.has(hex) || data[i + 3] !== 255) stray.add(hex);
      }
      expect([...stray]).toEqual([]);
    },
  );
});
