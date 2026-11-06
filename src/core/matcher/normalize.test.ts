import { describe, expect, it } from 'vitest';
import { normalize, singularize } from './normalize';

describe('normalize', () => {
  it.each([
    ['Platypus', 'platypus'],
    ['  RED   fox  ', 'red fox'],
    ['Killer-Whales!', 'killer whale'],
    // The trailing s goes too, but names and guesses lose it alike.
    ['Grévy’s zebra', 'grevy zebra'],
    ['Ñandú', 'nandu'],
    ['polar.bear,', 'polar bear'],
    ['!!!', ''],
    ['   ', ''],
    ['', ''],
    ['熊猫', '熊猫'],
  ])('%j -> %j', (raw, expected) => {
    expect(normalize(raw)).toBe(expected);
  });
});

describe('singularize', () => {
  it.each([
    ['wolves', 'wolf'],
    ['geese', 'goose'],
    ['mice', 'mouse'],
    ['foxes', 'fox'],
    ['finches', 'finch'],
    ['butterflies', 'butterfly'],
    ['cats', 'cat'],
    ['horses', 'horse'],
    ['walrus', 'walrus'],
    ['mantis', 'mantis'],
    ['albatross', 'albatross'],
    ['bus', 'bus'],
    ['emu', 'emu'],
  ])('%s -> %s', (word, expected) => {
    expect(singularize(word)).toBe(expected);
  });
});
