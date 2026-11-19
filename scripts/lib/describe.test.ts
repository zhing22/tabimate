import { describe, expect, it } from 'vitest';
import { firstSentence, shortenDescription } from './describe';

const wordCount = (s: string) => s.split(' ').length;

describe('firstSentence', () => {
  it('stops at the first full stop that ends a sentence', () => {
    expect(firstSentence('The lion is a cat. It lives in Africa.')).toBe('The lion is a cat.');
  });

  it('is not fooled by abbreviations and initials', () => {
    expect(firstSentence('It was described c. 1758 by Linnaeus. Later it moved.')).toBe(
      'It was described c. 1758 by Linnaeus.',
    );
    expect(firstSentence('Named by J. Gould in Australia. More text.')).toBe(
      'Named by J. Gould in Australia.',
    );
  });
});

describe('shortenDescription', () => {
  it.each([
    [
      'The emperor penguin (Aptenodytes forsteri) is the tallest and heaviest of all living penguin species and is endemic to Antarctica.',
      'The tallest and heaviest of all living penguin species and is endemic to Antarctica.',
    ],
    [
      'The kākāpō (Māori: [kaːkaːpɔː]; Strigops habroptilus) is a species of large, flightless, nocturnal, ground-dwelling parrot endemic to New Zealand. It is the heaviest parrot.',
      'A large, flightless, nocturnal, ground-dwelling parrot endemic to New Zealand.',
    ],
    [
      'The barn owl (Tyto alba) is the most widely distributed species of owl in the world; it is found almost everywhere.',
      'The most widely distributed owl in the world.',
    ],
    ['The axolotl is a species of salamander.', 'A salamander.'],
    ['The ostrich is an species of bird.', 'A bird.'],
    [
      'The kākāpō, sometimes known as the owl-parrot, is a large, flightless, nocturnal, ground-dwelling bird endemic to New Zealand.',
      'A large, flightless, nocturnal, ground-dwelling bird endemic to New Zealand.',
    ],
    [
      'The koala, sometimes inaccurately called the koala bear, is an arboreal herbivorous marsupial native to Australia.',
      'An arboreal herbivorous marsupial native to Australia.',
    ],
    [
      'Penguins are a group of aquatic flightless birds from the family Spheniscidae of the order Sphenisciformes.',
      'Aquatic flightless birds from the family Spheniscidae of the order Sphenisciformes.',
    ],
  ])('%j', (extract, expected) => {
    const out = shortenDescription(extract);
    expect(out).toBe(expected);
    expect(wordCount(out)).toBeLessThanOrEqual(15);
  });

  it('cuts a long sentence at a clause break, without a dangling stopword', () => {
    const out = shortenDescription(
      'The red fox is the largest of the true foxes and one of the most widely distributed members of the order Carnivora, being present across the entire Northern Hemisphere.',
    );
    expect(wordCount(out)).toBeLessThanOrEqual(15);
    expect(out).toMatch(/^The largest of the true foxes/);
    expect(out).not.toMatch(/\b(?:and|of|the)\.$/);
  });

  it('keeps to a smaller limit when asked, and returns empty for nothing usable', () => {
    expect(
      wordCount(shortenDescription('The cat is a small furry hunting animal kept as a pet.', 5)),
    ).toBeLessThanOrEqual(5);
    expect(shortenDescription('')).toBe('');
  });
});
