// Bird looks: small perching birds.
import type { AvianLook } from './avianLooks.ts';

const SMALL = { pose: 'perch', size: [3.5, 4], head: 3, legs: 2 } as const;

export const SMALL_BIRD_LOOKS = {
  /** Robins, sparrows, tits: a coloured breast and cap. */
  songbird: { ...SMALL, beak: 'short', beakKey: 'o', tail: 'short', marks: ['breast', 'cap'] },
  starling: { ...SMALL, beak: 'dagger', tail: 'short', marks: ['spots'] },
  /** Jays, cardinals, crowned pigeons: a crest, a mask, a long tail. */
  'crested-songbird': {
    ...SMALL,
    beak: 'short',
    crest: 'spiky',
    crestKey: 'b',
    tail: 'long',
    tailLen: 5,
    marks: ['breast', 'mask'],
  },
  hummingbird: {
    ...SMALL,
    size: [2.5, 3],
    head: 2.5,
    legs: 1,
    beak: 'needle',
    beakKey: 'o',
    tail: 'short',
    tailLen: 2,
    marks: ['breast', 'throat'],
    wing: 5,
  },
  swordbill: {
    ...SMALL,
    size: [2.5, 3],
    head: 2.5,
    legs: 1,
    beak: 'sword',
    beakKey: 'o',
    tail: 'short',
    tailLen: 2,
    marks: ['throat'],
    wing: 5,
  },
  kingfisher: {
    ...SMALL,
    head: 3.5,
    legs: 1,
    beak: 'dagger',
    beakKey: 'o',
    tail: 'short',
    tailLen: 2,
    marks: ['breast'],
  },
  /** Magpies, ravens, quetzals: a long tail and a bar on the wing. */
  magpie: { ...SMALL, beak: 'short', tail: 'long', tailLen: 8, marks: ['breast', 'wingbar'] },
  swallow: {
    ...SMALL,
    size: [3, 3.5],
    head: 2.5,
    legs: 1,
    beak: 'short',
    beakKey: 'o',
    tail: 'fork',
    tailLen: 5,
    marks: ['breast', 'throat'],
    wing: 7,
  },
  woodpecker: {
    ...SMALL,
    size: [3.5, 4.5],
    beak: 'dagger',
    beakKey: 'o',
    tail: 'short',
    tailKey: 'o',
    marks: ['breast', 'cap'],
  },
  'crested-woodpecker': {
    ...SMALL,
    size: [3.5, 4.5],
    beak: 'dagger',
    beakKey: 'o',
    crest: 'spiky',
    tail: 'short',
    tailKey: 'o',
    marks: ['breast'],
  },
  /** Hornbills: a huge beak with a casque; toucans: a huge bright beak. */
  hornbill: {
    ...SMALL,
    size: [4, 4.5],
    beak: 'big',
    crest: 'casque',
    tail: 'long',
    tailLen: 5,
    marks: ['throat'],
  },
  toucan: { ...SMALL, size: [3.5, 4.5], beak: 'big', tail: 'short', marks: ['cheek'] },
} as const satisfies Record<string, AvianLook>;
