// What each archetype's placeholder looks like: a body plan and its features.
// Every archetype in animals.json needs an entry (a test checks); a family
// borrows a shared look (HOOFED, RAPTOR...) and changes what sets it apart.
import type { PlanSpec } from './plans.ts';
import { PARROT_LOOKS } from './parrotLooks.ts';
import { PRIMATE_LOOKS } from './primateLooks.ts';

const HOOFED = {
  plan: 'quadruped',
  body: [12, 5],
  leg: 5,
  neck: 2,
  snout: 1,
  tail: 'short',
} as const;
const RAPTOR = { plan: 'bird', beak: 'hook', wing: 8, tail: 3 } as const;
const SONGBIRD = { plan: 'bird', body: [6, 4], leg: 2, tail: 3 } as const;
const WATERFOWL = { plan: 'bird', body: [10, 5], leg: 2, neck: 2, beak: 'flat', tail: 1 } as const;
const SEABIRD = { plan: 'bird', body: [9, 4], leg: 2, beak: 'long', wing: 9 } as const;
const WADER = { plan: 'bird', leg: 6, neck: 3, beak: 'long', tail: 1 } as const;
const GENERIC = { plan: 'quadruped', ears: 'round' } as const;

export const ARCHETYPES: Readonly<Record<string, PlanSpec>> = {
  // Primates: a look per archetype (primateLooks.ts).
  ...Object.fromEntries(
    Object.keys(PRIMATE_LOOKS).map((look) => [look, { plan: 'primate', look } as PlanSpec]),
  ),
  // Parrots: a look per archetype (parrotLooks.ts).
  ...Object.fromEntries(
    Object.keys(PARROT_LOOKS).map((look) => [look, { plan: 'parrot', look } as PlanSpec]),
  ),
  'big-cat': { plan: 'quadruped', tail: 'long', ears: 'round', pattern: 'stripes' },
  // Elephants, rabbits and hares by look (elephant.ts, rabbit.ts).
  elephant: { plan: 'elephant', look: 'african' },
  'forest-elephant': { plan: 'elephant', look: 'forest' },
  'asian-elephant': { plan: 'elephant', look: 'asian' },
  rabbit: { plan: 'rabbit', look: 'rabbit' },
  'pygmy-rabbit': { plan: 'rabbit', look: 'pygmy' },
  'snowshoe-hare': { plan: 'rabbit', look: 'snowshoe' },
  // Bears by look (bear.ts); each species' colours are in palettes.json.
  bear: { plan: 'bear', look: 'plain' },
  panda: { plan: 'bear', look: 'panda' },
  'chest-mark-bear': { plan: 'bear', look: 'chest' },
  'spectacled-bear': { plan: 'bear', look: 'spectacled' },
  'small-carnivore': {
    plan: 'quadruped',
    body: [10, 4],
    leg: 2,
    ears: 'round',
    tail: 'bushy',
    pattern: 'back',
  },
  canine: { plan: 'quadruped', body: [11, 4], snout: 2, tail: 'bushy' },
  marsupial: { plan: 'quadruped', body: [8, 6], leg: 3, ears: 'long', tail: 'thick', hop: true },
  monotreme: { plan: 'quadruped', body: [10, 4], leg: 1, snout: 2, ears: 'none', tail: 'short' },
  'small-mammal': { plan: 'quadruped', body: [8, 4], leg: 1, ears: 'round' },
  rhino: { plan: 'quadruped', body: [14, 7], head: 3, snout: 1, horns: 'nose', tail: 'short' },
  hoofed: HOOFED,
  hippo: {
    plan: 'quadruped',
    body: [13, 7],
    leg: 2,
    head: 3,
    snout: 1,
    ears: 'round',
    tail: 'short',
  },
  reptile: {
    plan: 'quadruped',
    body: [11, 3],
    leg: 1,
    snout: 3,
    ears: 'none',
    tail: 'thick',
    pattern: 'back',
  },
  ratite: { plan: 'bird', body: [8, 6], leg: 7, neck: 5, head: 1.5, tail: 1, wing: 4 },
  fowl: { plan: 'bird', body: [8, 6], crest: true, tail: 3 },
  amphibian: { plan: 'quadruped', body: [10, 3], leg: 1, ears: 'none', tail: 'thick' },
  raptor: RAPTOR,
  owl: { plan: 'bird', body: [7, 7], head: 3, ears: true, beak: 'hook', tail: 1 },
  wader: WADER,
  songbird: SONGBIRD,
  waterfowl: WATERFOWL,
  seabird: SEABIRD,
  bat: { plan: 'bird', body: [5, 4], leg: 1, beak: 'none', ears: true, wing: 8, tail: 0 },
  // Whales and sharks by look (whale.ts, shark.ts); colours in palettes.json.
  rorqual: { plan: 'whale', look: 'rorqual' },
  'humpback-whale': { plan: 'whale', look: 'humpback' },
  'right-whale': { plan: 'whale', look: 'right' },
  orca: { plan: 'whale', look: 'orca' },
  'sperm-whale': { plan: 'whale', look: 'sperm' },
  beluga: { plan: 'whale', look: 'beluga' },
  narwhal: { plan: 'whale', look: 'narwhal' },
  dolphin: { plan: 'fish', body: [14, 5], tail: 'flukes', dorsal: 'small', snout: 2 },
  shark: { plan: 'shark', look: 'classic' },
  'tiger-shark': { plan: 'shark', look: 'striped' },
  hammerhead: { plan: 'shark', look: 'hammerhead' },
  'filter-shark': { plan: 'shark', look: 'filter' },
  turtle: { plan: 'quadruped', body: [12, 5], leg: 2, ears: 'none', shell: true, tail: 'short' },
  octopus: { plan: 'blob', kind: 'octopus' },
  sirenian: { plan: 'fish', body: [15, 7], tail: 'flukes', dorsal: 'none', flippers: true },
  otter: { plan: 'quadruped', body: [12, 4], leg: 2, ears: 'round', tail: 'thick' },
  seal: { plan: 'fish', body: [14, 6], tail: 'flukes', dorsal: 'none', snout: 1, flippers: true },
  // Penguins by look (penguin.ts); each species' colours are in palettes.json.
  penguin: { plan: 'penguin', look: 'banded' },
  'great-penguin': { plan: 'penguin', look: 'great' },
  'crested-penguin': { plan: 'penguin', look: 'crested' },
  'brush-penguin': { plan: 'penguin', look: 'brush' },
  frog: { plan: 'quadruped', body: [9, 5], leg: 2, head: 3, ears: 'none', tail: 'none', hop: true },
  snake: { plan: 'serpent' },
  lizard: { plan: 'quadruped', body: [10, 3], leg: 2, snout: 1, ears: 'none', tail: 'thick' },
  tortoise: { plan: 'quadruped', body: [12, 6], leg: 2, ears: 'none', shell: true, tail: 'short' },
  deer: { ...HOOFED, neck: 3, horns: 'antlers' },
  antelope: { ...HOOFED, horns: 'horns' },
  squirrel: { plan: 'quadruped', body: [8, 4], leg: 2, tail: 'bushy' },
  hawk: { ...RAPTOR, body: [7, 4] },
  gull: SEABIRD,
  heron: { ...WADER, leg: 7, neck: 5 },
  swan: { ...WATERFOWL, body: [11, 5], neck: 5 },
  goose: { ...WATERFOWL, neck: 4 },
  woodpecker: { ...SONGBIRD, beak: 'long', crest: true },
  hornbill: { plan: 'bird', beak: 'big', tail: 3 },
  toucan: { plan: 'bird', body: [7, 5], beak: 'big' },
  ray: { plan: 'fish', body: [12, 3], tail: 'whip', dorsal: 'none' },
  jellyfish: { plan: 'blob', kind: 'jelly' },
  crab: { plan: 'bug', body: [10, 4], legs: 8, claws: true },
  butterfly: { plan: 'bug', body: [6, 2], wings: 'butterfly', antennae: true },
  bee: { plan: 'bug', body: [7, 4], wings: 'buzz', antennae: true, stripes: true },
  beetle: { plan: 'bug', body: [8, 4], shell: true, antennae: true },
  ant: { plan: 'bug', body: [9, 3], antennae: true },
  spider: { plan: 'bug', body: [8, 4], legs: 8 },
  scorpion: { plan: 'bug', legs: 8, claws: true, stinger: true },
  camel: { ...HOOFED, body: [12, 6], leg: 6, neck: 4, hump: true },
  hare: { plan: 'rabbit', look: 'hare' },
  pelican: { ...WATERFOWL, body: [8, 5], beak: 'pouch' },
  vulture: { ...RAPTOR, body: [10, 6], neck: 2 },
  mammal: GENERIC,
  bird: { plan: 'bird' },
  fish: { plan: 'fish' },
  animal: GENERIC,
  crustacean: { plan: 'bug', body: [10, 3], legs: 10, claws: true },
  insect: { plan: 'bug', antennae: true, wings: 'buzz' },
  mollusc: { plan: 'blob', kind: 'snail' },
};
