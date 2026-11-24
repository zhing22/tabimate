// Bird looks: waders.
import type { AvianLook } from './avianLooks.ts';

const WADER = { pose: 'stand', size: [4, 3], head: 2, legs: 7, neck: 5 } as const;

export const GROUND_BIRD_LOOKS = {
  /** Pink, on long pink legs, the beak bent with a black tip. */
  flamingo: { ...WADER, beak: 'bent', beakKey: 'h', legKey: 'b', tail: 'short', tailLen: 2 },
  /** A red crown; the crowned crane's golden crest instead. */
  crane: {
    ...WADER,
    beak: 'dagger',
    beakKey: 's',
    marks: ['cap'],
    tail: 'short',
    tailLen: 2,
    tailKey: 's',
  },
  'crowned-crane': {
    ...WADER,
    legs: 5,
    neck: 4,
    beak: 'short',
    beakKey: 'o',
    crest: 'crown',
    crestKey: 'a',
    marks: ['cheek'],
    tail: 'short',
    tailLen: 2,
    tailKey: 's',
  },
  secretarybird: {
    ...WADER,
    neck: 3,
    beak: 'hook',
    crest: 'quills',
    crestKey: 'o',
    tail: 'long',
    tailLen: 4,
    tailKey: 's',
  },
  stork: {
    ...WADER,
    legs: 6,
    neck: 3,
    beak: 'dagger',
    legKey: 'a',
    tail: 'short',
    tailLen: 2,
    tailKey: 's',
  },
  heron: {
    ...WADER,
    legs: 6,
    beak: 'dagger',
    crest: 'plume',
    crestKey: 'o',
    tail: 'short',
    tailLen: 2,
  },
  shoebill: {
    ...WADER,
    size: [4, 4],
    head: 2.5,
    legs: 6,
    neck: 2,
    beak: 'shoe',
    beakKey: 'h',
    tail: 'short',
    tailLen: 2,
  },
  /** Plovers with a crest and bright legs. */
  lapwing: {
    pose: 'stand',
    size: [3, 2.5],
    head: 2.5,
    legs: 4,
    beak: 'short',
    beakKey: 'o',
    crest: 'tuft',
    crestKey: 'o',
    legKey: 'a',
    marks: ['breast'],
  },
} as const satisfies Record<string, AvianLook>;
