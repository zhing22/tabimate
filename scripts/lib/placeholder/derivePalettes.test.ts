import { describe, expect, it } from 'vitest';
import type { HexColour } from '../../../src/config/colour';
import { DERIVED_PALETTE } from '../../../src/config/placeholderArt';
import { addDerivedPalettes, derivePalette, type RawAnimal } from './derivePalettes';

const MASTER: HexColour[] = [
  '#181425',
  '#3e2731',
  '#733e39',
  '#b86f50',
  '#e4a672',
  '#ead4aa',
  '#ffffff',
  '#262b44',
];

describe('derivePalette', () => {
  it('takes every colour from the master palette, with distinct shades', () => {
    const p = derivePalette('#c8902c', MASTER);
    for (const hex of p) expect(MASTER).toContain(hex);
    const [, base, shadow, highlight] = p;
    expect(new Set([base, shadow, highlight]).size).toBe(3);
  });

  it('gives a dark animal light eyes, and a light one dark eyes', () => {
    expect(derivePalette('#1a1a2a', MASTER)[5]).toBe(DERIVED_PALETTE.lightEye);
    expect(derivePalette('#f0e0b0', MASTER)[5]).toBe(DERIVED_PALETTE.darkEye);
  });
});

describe('addDerivedPalettes', () => {
  it('fills only animals listed and without a palette, never changing existing ones', () => {
    const animals: RawAnimal[] = [
      { id: 'lion', tint: '#c8902c', palette: 'lion' },
      { id: 'fox', tint: '#d77643' },
      { id: 'canid', tint: '#d77643' },
      { id: 'owl', tint: '#733e39' },
    ];
    const palettes: Record<string, HexColour[]> = {
      lion: ['#000000', '#000000', '#000000', '#000000', '#000000', '#000000'],
      owl: ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'],
    };
    const before = structuredClone(palettes);
    const added = addDerivedPalettes(animals, palettes, MASTER, new Set(['lion', 'fox', 'owl']));
    expect(added).toEqual(['fox', 'owl']);
    expect(animals.map((a) => a.palette)).toEqual(['lion', 'fox', undefined, 'owl']);
    expect(palettes.lion).toEqual(before.lion);
    expect(palettes.owl).toEqual(before.owl);
    expect(palettes.fox).toHaveLength(6);
  });
});
