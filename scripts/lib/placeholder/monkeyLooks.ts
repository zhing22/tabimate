// Monkeys (on all fours, with a tail) and lemurs (an arched tail): each a look of its own.
import { ellipse, line, rect, set } from './grid.ts';
import { paint, ruff, mane, type PrimateLook } from './primateMarks.ts';

export const MONKEY_LOOKS = {
  'snow-monkey': {
    stance: 'monkey',
    size: [5, 3],
    head: 3.5,
    tail: 'short',
    face: (g, f) => {
      for (const dx of [-1, 0, 1]) set(g, f.hx + dx, f.hy - Math.round(f.hr), 'a'); // snow on its head
      set(g, f.hx, f.hy - Math.round(f.hr) - 1, 'a');
    },
  },
  macaque: {
    stance: 'monkey',
    size: [5, 3],
    head: 3.5,
    tail: 'curl',
    body: (g, f) => {
      for (let y = f.by - 1; y <= f.by + 1; y++) paint(g, f.bx - f.rx + 1, y, 'a'); // orange rump
    },
  },
  proboscis: {
    stance: 'monkey',
    size: [5, 4],
    head: 3.5,
    tail: 'long',
    body: (g, f) => ellipse(g, f.bx + 1, f.by + 1, 2.5, 2, 'h'), // pot belly
    face: (g, f) => rect(g, f.hx + 3, f.hy, f.hx + 4, f.hy + 3, 'a'), // the big droopy nose
  },
  mandrill: {
    stance: 'monkey',
    size: [5, 3],
    head: 3.5,
    tail: 'short',
    face: (g, f) => {
      rect(g, f.hx + 1, f.hy, f.hx + 4, f.hy + 2, 'h'); // long blue-ridged muzzle
      rect(g, f.hx + 1, f.hy, f.hx + 4, f.hy, 'a'); // red down the middle
    },
  },
  'snub-nosed': {
    stance: 'monkey',
    size: [5, 3],
    head: 3.5,
    tail: 'long',
    blush: true,
    behindHead: mane,
  },
  howler: {
    stance: 'monkey',
    size: [5, 3],
    head: 3.5,
    tail: 'prehensile',
    body: (g, f) => {
      for (let x = f.bx - 2; x <= f.bx + 2; x++) paint(g, x, f.by + 1, 'a'); // golden mantle
    },
    face: (g, f) => rect(g, f.hx, f.hy + 3, f.hx + 1, f.hy + 4, 'b'), // beard
  },
  'squirrel-monkey': {
    stance: 'monkey',
    size: [4, 3],
    head: 3.5,
    tail: 'long',
    limbs: 'a',
    face: (g, f) => rect(g, f.hx + 2, f.hy + 1, f.hx + 3, f.hy + 2, 'o'), // black muzzle
  },
  tamarin: {
    stance: 'monkey',
    size: [4, 3],
    head: 3,
    tail: 'long',
    behindHead: mane,
  },
  'ring-tailed-lemur': {
    stance: 'lemur',
    size: [5, 3],
    head: 3,
    tail: 'arch',
    bandedTail: true,
    face: (g, f) => rect(g, f.hx - 1, f.hy - 2, f.hx + 2, f.hy + 1, 'o'), // dark eye mask
  },
  'ruffed-lemur': {
    stance: 'lemur',
    size: [5, 3],
    head: 3,
    tail: 'arch',
    behindHead: ruff,
    face: (g, f) => rect(g, f.hx + 2, f.hy, f.hx + 3, f.hy + 2, 'a'), // dark muzzle
  },
  'mouse-lemur': {
    stance: 'lemur',
    size: [3, 2],
    head: 3,
    tail: 'curl', // tiny: a hanging tail would reach the ground
    blush: true,
    face: (g, f) => {
      ellipse(g, f.hx - 2, f.hy - 3, 1.5, 1.5, 'h'); // a big round ear...
      set(g, f.hx - 2, f.hy - 3, 'a'); // ...pink inside
    },
  },
  'aye-aye': {
    stance: 'lemur',
    size: [4, 3],
    head: 3,
    tail: 'bushy',
    body: (g, f) => line(g, f.bx + f.rx, f.by + 1, f.bx + f.rx + 4, f.by + 2, 'a'), // the long finger
    face: (g, f) => {
      rect(g, f.hx - 3, f.hy - 6, f.hx - 1, f.hy - 2, 'b'); // huge ears
      rect(g, f.hx - 2, f.hy - 5, f.hx - 2, f.hy - 3, 'a');
    },
  },
} as const satisfies Record<string, PrimateLook>;
