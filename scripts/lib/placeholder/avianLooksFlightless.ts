// Bird looks: big birds of the ground (ratites, kiwis, peacocks, turkeys, the dodo).
import type { AvianLook } from './avianLooks.ts';

const RATITE = { pose: 'stand', size: [5, 4], head: 2, legs: 6, neck: 5, beak: 'short' } as const;

export const FLIGHTLESS_BIRD_LOOKS = {
  /** Ostriches, emus and rheas: a bare neck, fluffy pale tail plumes. */
  ostrich: { ...RATITE, neckKey: 'h', legKey: 'h', tail: 'short', tailLen: 2, tailKey: 'a' },
  cassowary: {
    ...RATITE,
    neck: 3,
    neckKey: 'h',
    legKey: 's',
    crest: 'casque',
    crestKey: 'a',
    marks: ['wattle'],
    tail: 'none',
  },
  kiwi: {
    pose: 'stand',
    size: [4.5, 4],
    head: 2.5,
    legs: 2,
    beak: 'down',
    beakKey: 'h',
    tail: 'none',
  },
  'spotted-kiwi': {
    pose: 'stand',
    size: [4.5, 4],
    head: 2.5,
    legs: 2,
    beak: 'down',
    beakKey: 'h',
    tail: 'none',
    marks: ['spots'],
  },
  /** Peacocks and lyrebirds: a crown and a long train with eyespots. */
  peacock: {
    pose: 'stand',
    size: [4, 3.5],
    head: 2,
    legs: 4,
    neck: 3,
    beak: 'short',
    beakKey: 'o',
    crest: 'crown',
    crestKey: 'a',
    tail: 'train',
    tailLen: 5,
    tailKey: 's',
  },
  turkey: {
    pose: 'stand',
    size: [5, 4],
    head: 2,
    legs: 4,
    neck: 2,
    beak: 'short',
    beakKey: 'h',
    headKey: 'h',
    neckKey: 'h',
    tail: 'fan',
    tailLen: 6,
    marks: ['wattle'],
  },
  dodo: {
    pose: 'stand',
    size: [5, 4.5],
    head: 3,
    legs: 3,
    beak: 'bighook',
    beakKey: 'h',
    tail: 'short',
    tailLen: 2,
    tailKey: 'h',
  },
} as const satisfies Record<string, AvianLook>;
