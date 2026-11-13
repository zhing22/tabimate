import { describe, expect, it } from 'vitest';
import { DataError } from './dataError';
import { validateAnimalArt, validateMasterPalette, validatePalettes } from './validateArt';

const SIX = ['#000000', '#111111', '#222222', '#333333', '#444444', '#555555'];
const palettes = validatePalettes({ tiger: SIX, white: SIX }, 'palettes.json');

describe('validatePalettes', () => {
  it('reads name -> 6 colours', () => {
    expect(palettes.get('tiger')).toEqual(SIX);
  });

  it.each([
    ['five colours', { tiger: SIX.slice(0, 5) }, 'tiger must have exactly 6 colours (got 5)'],
    ['a bad hex', { tiger: [...SIX.slice(0, 5), 'red'] }, 'tiger[5] must be a #rrggbb colour'],
    ['not an object', ['tiger'], 'must be an object'],
  ])('rejects %s', (_name, json, message) => {
    expect(() => validatePalettes(json, 'palettes.json')).toThrow(DataError);
    expect(() => validatePalettes(json, 'palettes.json')).toThrow(message);
  });
});

describe('validateMasterPalette', () => {
  it('reads a list of colours, and rejects an empty or bad one', () => {
    expect(validateMasterPalette(['#ffffff'], 'm.json')).toEqual(['#ffffff']);
    expect(() => validateMasterPalette([], 'm.json')).toThrow('at least one colour');
    expect(() => validateMasterPalette(['#fff'], 'm.json')).toThrow('#rrggbb');
  });
});

describe('validateAnimalArt', () => {
  const animal = (extra: object) => [{ id: 'tiger', ...extra }, { id: 'koala' }];

  it('keeps art for animals that have it, skips the rest', () => {
    const art = validateAnimalArt(
      animal({ palette: 'tiger', shinyPalette: 'white', paletteOverride: { '5': '#3a7d44' } }),
      'animals.json',
      palettes,
    );
    expect([...art.keys()]).toEqual(['tiger']);
    expect(art.get('tiger')).toEqual({
      palette: 'tiger',
      shinyPalette: 'white',
      paletteOverride: { 5: '#3a7d44' },
    });
  });

  it.each([
    [
      'an unknown palette',
      { palette: 'zebra' },
      '[0].palette palette "zebra" is not in palettes.json',
    ],
    [
      'an unknown shiny palette',
      { palette: 'tiger', shinyPalette: 'gold' },
      'is not in palettes.json',
    ],
    ['a shiny palette alone', { shinyPalette: 'white' }, '[0].palette must be a non-empty string'],
    [
      'slot 6',
      { palette: 'tiger', paletteOverride: { '6': '#000000' } },
      'is not a palette slot (0-5)',
    ],
    [
      'slot "01"',
      { palette: 'tiger', paletteOverride: { '01': '#000000' } },
      'is not a palette slot',
    ],
    ['a bad override colour', { palette: 'tiger', paletteOverride: { '1': 'blue' } }, '#rrggbb'],
  ])('rejects %s', (_name, extra, message) => {
    expect(() => validateAnimalArt(animal(extra), 'animals.json', palettes)).toThrow(message);
  });
});
