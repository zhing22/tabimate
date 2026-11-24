// Bird looks: seabirds and water birds.
import type { AvianLook } from './avianLooks.ts';

const SMALL = { pose: 'perch', size: [3.5, 4], head: 3, legs: 2 } as const;
const SEA = { pose: 'stand', size: [4.5, 3], head: 2.5, legs: 2, wing: 9 } as const;
const WATER = { pose: 'stand', size: [4.5, 3], head: 2.5, legs: 2 } as const;

export const WATER_BIRD_LOOKS = {
  puffin: {
    ...SMALL,
    size: [3.5, 4.5],
    beak: 'puffin',
    legKey: 'a',
    tail: 'short',
    tailLen: 2,
    marks: ['breast', 'disc'],
  },
  'tufted-puffin': {
    ...SMALL,
    size: [3.5, 4.5],
    beak: 'puffin',
    legKey: 'a',
    crest: 'tuft',
    tail: 'short',
    tailLen: 2,
    marks: ['breast', 'disc'],
  },
  gull: { ...SEA, legs: 3, beak: 'dagger', tail: 'short', tailLen: 2, marks: ['breast'] },
  /** Black-headed and laughing gulls, terns: a dark hood, a red beak and legs. */
  'hooded-gull': {
    ...SEA,
    legs: 3,
    beak: 'dagger',
    beakKey: 'h',
    legKey: 'h',
    headKey: 'a',
    tail: 'short',
    tailLen: 2,
  },
  albatross: { ...SEA, beak: 'hook', tail: 'short', tailLen: 2, tailKey: 's', marks: ['breast'] },
  /** The blue-footed booby's famous feet. */
  booby: { ...SEA, beak: 'dagger', legKey: 'a', tail: 'short', tailLen: 3, marks: ['breast'] },
  frigatebird: {
    ...SEA,
    pose: 'perch',
    size: [4, 4],
    beak: 'hook',
    beakKey: 'h',
    tail: 'fork',
    tailLen: 5,
    marks: ['pouch'],
  },
  /** Ducks: a coloured head, a pale beak. */
  duck: {
    ...WATER,
    neck: 1,
    beak: 'flat',
    beakKey: 'h',
    headKey: 'a',
    neckKey: 'a',
    tail: 'short',
    tailLen: 2,
  },
  'fancy-duck': {
    ...WATER,
    neck: 1,
    beak: 'flat',
    beakKey: 'h',
    headKey: 'a',
    neckKey: 'a',
    crest: 'tuft',
    crestKey: 's',
    tail: 'short',
    tailLen: 2,
    marks: ['mask'],
  },
  swan: { ...WATER, size: [5, 3.5], head: 2, neck: 5, beak: 'flat', tail: 'short', tailLen: 2 },
  /** Geese: a dark head and neck with a pale chinstrap. */
  goose: {
    ...WATER,
    size: [4.5, 3.5],
    legs: 3,
    neck: 3,
    beak: 'flat',
    beakKey: 'o',
    headKey: 'a',
    neckKey: 'a',
    marks: ['cheek', 'breast'],
    tail: 'short',
    tailLen: 2,
  },
  pelican: {
    ...WATER,
    size: [5, 3.5],
    neck: 2,
    beak: 'pouch',
    marks: ['breast'],
    tail: 'short',
    tailLen: 2,
  },
} as const satisfies Record<string, AvianLook>;
