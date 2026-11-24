// Bird looks: birds of prey and owls.
import type { AvianLook } from './avianLooks.ts';

const RAPTOR = { pose: 'perch', size: [4, 5], head: 3, legs: 2, beak: 'bighook' } as const;

export const PREY_BIRD_LOOKS = {
  /** A pale head and tail (a bald eagle's white, a golden eagle's gold nape). */
  eagle: { ...RAPTOR, headKey: 'h', tail: 'short', tailKey: 'h' },
  /** Harpy and Philippine eagles: a shaggy crest, a pale chest. */
  'crested-eagle': { ...RAPTOR, crest: 'spiky', crestKey: 'h', marks: ['breast'], wing: 8 },
  falcon: {
    ...RAPTOR,
    size: [3.5, 4.5],
    beak: 'hook',
    tail: 'long',
    tailLen: 5,
    marks: ['breast', 'moustache'],
  },
  /** Vultures and condors: a bare coloured head, a ruff, a pale beak. */
  vulture: {
    ...RAPTOR,
    size: [4.5, 5],
    head: 2.5,
    neck: 1,
    beak: 'hook',
    beakKey: 'h',
    headKey: 'h',
    marks: ['ruff'],
    wing: 9,
  },
  /** Hawks and kites: a bright tail (the red-tailed hawk's). */
  hawk: {
    ...RAPTOR,
    size: [4, 4.5],
    beak: 'hook',
    beakKey: 'o',
    tail: 'short',
    tailKey: 'a',
    marks: ['breast'],
  },
  osprey: {
    ...RAPTOR,
    size: [4, 4.5],
    beak: 'hook',
    beakKey: 'o',
    tail: 'short',
    tailKey: 'a',
    marks: ['breast', 'mask'],
    wing: 8,
  },
  owl: {
    pose: 'perch',
    size: [4.5, 5],
    head: 4,
    legs: 1,
    beak: 'hook',
    beakKey: 'o',
    tail: 'short',
    tailLen: 2,
    marks: ['breast', 'disc'],
  },
  'horned-owl': {
    pose: 'perch',
    size: [4.5, 5],
    head: 4,
    legs: 1,
    beak: 'hook',
    beakKey: 'o',
    tail: 'short',
    tailLen: 2,
    crest: 'ears',
    crestKey: 'b',
    marks: ['disc'],
  },
} as const satisfies Record<string, AvianLook>;
