import { h, svg } from '../dom';
import { drawPixels } from './pixelArt';

// "Tabimate" in a 7-row pixel face, and a 旅 (tabi, journey) stamp beside it.
const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  T: ['ooooo', '..o..', '..o..', '..o..', '..o..', '..o..', '..o..'],
  a: ['.....', '.....', '.ooo.', '....o', '.oooo', 'o...o', '.oooo'],
  b: ['o....', 'o....', 'oooo.', 'o...o', 'o...o', 'o...o', 'oooo.'],
  i: ['o', '.', 'o', 'o', 'o', 'o', 'o'],
  m: ['.....', '.....', 'oo.o.', 'o.o.o', 'o.o.o', 'o.o.o', 'o.o.o'],
  t: ['.o..', '.o..', 'ooo.', '.o..', '.o..', '.o..', '..oo'],
  e: ['.....', '.....', '.ooo.', 'o...o', 'ooooo', 'o....', '.oooo'],
};

/** A red seal with 旅 in 7x7 pixels inside a one-pixel border. */
const STAMP = [
  'aaaaaaaaa',
  'aaAaaaAaa',
  'aAAAaAAAa',
  'aaAaaAaaa',
  'aaAAaAAAa',
  'aaAaAAaaa',
  'aAaaAaAaa',
  'aAaAaaAAa',
  'aaaaaaaaa',
];

const WORD = 'Tabimate';
const GAP = 1;
const STAMP_GAP = 2;

/** "Tabimate" laid out left to right: each glyph's rows and its x. */
function wordLayout(): { rows: readonly string[]; x: number }[] {
  let x = 0;
  return [...WORD].map((ch) => {
    const rows = GLYPHS[ch]!;
    const placed = { rows, x };
    x += rows[0]!.length + GAP;
    return placed;
  });
}

export type WordmarkSize = 'lg' | 'md' | 'sm';

/**
 * The Tabimate wordmark: the name in pixel letters with a small red 旅 stamp,
 * colours from the tokens. Sizes come from CSS (.wordmark--lg/md/sm). The
 * accessible name is "Tabimate"; `extra` adds visible text after it ("#21").
 */
export function wordmark(size: WordmarkSize, extra?: string): HTMLElement {
  const placed = wordLayout();
  const last = placed[placed.length - 1]!;
  const wordWidth = last.x + last.rows[0]!.length;
  const height = STAMP.length;
  const textTop = height - GLYPHS['T']!.length;
  const art = svg('svg', {
    class: 'wordmark__art',
    viewBox: `0 0 ${wordWidth + STAMP_GAP + STAMP[0]!.length} ${height}`,
    'shape-rendering': 'crispEdges',
    'aria-hidden': 'true',
    focusable: 'false',
  });
  for (const glyph of placed) drawPixels(art, glyph.rows, glyph.x, textTop);
  drawPixels(art, STAMP, wordWidth + STAMP_GAP, 0);
  return h(
    'span',
    {
      class: `wordmark wordmark--${size}`,
      role: 'img',
      'aria-label': extra ? `Tabimate ${extra}` : 'Tabimate',
    },
    art,
    extra ? h('span', { class: 'wordmark__extra', 'aria-hidden': 'true' }, extra) : null,
  );
}
