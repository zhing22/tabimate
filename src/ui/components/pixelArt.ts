import { svg } from '../dom';

/**
 * Pixel art in the UI, drawn as SVG from a grid of characters so it stays
 * crisp at any size. Each character is a colour token ('.' is clear);
 * `c` is currentColor, so CSS can colour a drawing (a footprint by level).
 */
const PIXEL_COLOURS: Readonly<Record<string, string>> = {
  o: 'var(--ink)',
  w: 'var(--paper)',
  W: '#fffaf0',
  e: 'var(--paper-edge)',
  a: 'var(--accent)',
  A: 'var(--accent-ink)',
  b: 'var(--level-2)',
  r: 'var(--level-3)',
  y: 'var(--level-5)',
  c: 'currentColor',
};

/** One rect per run of same-coloured pixels on a row, grouped by colour. */
function runsByColour(rows: readonly string[]): Map<string, [number, number, number][]> {
  const byColour = new Map<string, [number, number, number][]>();
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const key = row[x]!;
      let end = x + 1;
      while (end < row.length && row[end] === key) end++;
      if (key !== '.' && key !== ' ') {
        const list = byColour.get(key) ?? [];
        list.push([x, y, end - x]);
        byColour.set(key, list);
      }
      x = end;
    }
  });
  return byColour;
}

/** Draws `rows` into `parent` at (dx, dy), in grid units. */
export function drawPixels(parent: SVGElement, rows: readonly string[], dx = 0, dy = 0): void {
  for (const [key, runs] of runsByColour(rows)) {
    const group = svg('g', { style: `fill: ${PIXEL_COLOURS[key] ?? key}` });
    for (const [x, y, w] of runs) {
      group.append(svg('rect', { x: x + dx, y: y + dy, width: w, height: 1 }));
    }
    parent.append(group);
  }
}

/** A drawing as its own decorative SVG, sized by CSS through `className`. */
export function pixelSvg(rows: readonly string[], className: string): SVGSVGElement {
  const width = Math.max(...rows.map((r) => r.length));
  const el = svg('svg', {
    class: className,
    viewBox: `0 0 ${width} ${rows.length}`,
    'shape-rendering': 'crispEdges',
    'aria-hidden': 'true',
    focusable: 'false',
  });
  drawPixels(el, rows);
  return el;
}
