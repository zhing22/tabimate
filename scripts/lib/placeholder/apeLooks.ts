// Apes (knuckle-walking) and gibbons (upright): each a look of its own.
import { ellipse, rect } from './grid.ts';
import { paint, shaggy, type PrimateLook } from './primateMarks.ts';

export const APE_LOOKS = {
  gorilla: {
    stance: 'knuckle',
    size: [6, 4],
    head: 3.5,
    tail: 'none',
    body: (g, f) => {
      for (let x = f.bx - 4; x <= f.bx + 1; x++)
        for (const dy of [0, 1]) paint(g, x, f.by - f.ry + dy, 'a'); // silver saddle
    },
    face: (g, f) => rect(g, f.hx - 1, f.hy - f.hr - 1, f.hx, f.hy - f.hr, 'b'), // the crest
  },
  chimpanzee: {
    stance: 'knuckle',
    size: [5, 4],
    head: 3.5,
    tail: 'none',
    blush: true,
    face: (g, f) => ellipse(g, f.hx - 3, f.hy, 1, 1.5, 'h'), // big ears
  },
  orangutan: {
    stance: 'knuckle',
    size: [5, 4],
    head: 3.5,
    tail: 'none',
    body: shaggy,
    face: (g, f) => rect(g, f.hx - 3, f.hy - 2, f.hx - 2, f.hy + 2, 'a'), // cheek pads
  },
  'sumatran-orangutan': {
    stance: 'knuckle',
    size: [5, 4],
    head: 3.5,
    tail: 'none',
    body: shaggy,
    face: (g, f) => rect(g, f.hx + 1, f.hy + 3, f.hx + 2, f.hy + 4, 'a'), // pale beard
  },
  'lar-gibbon': {
    stance: 'upright',
    size: [3, 4],
    head: 3.5,
    tail: 'none',
    blush: true,
    face: (g, f) => {
      for (const x of [f.bx + 6 + f.s, f.bx - 6 - f.s])
        rect(g, x, f.hy - f.hr, x + 1, f.hy - f.hr, 'h'); // white hands
    },
  },
  siamang: {
    stance: 'upright',
    size: [3, 4],
    head: 3.5,
    tail: 'none',
    face: (g, f) => ellipse(g, f.hx + 1, f.hy + f.hr, 1.5, 1.5, 'a'), // throat sac
  },
} as const satisfies Record<string, PrimateLook>;
