// The body shared by sharks and whales: a long, tapering body seen side-on,
// facing right, countershaded (dark back in base, pale belly in highlight).
// The tail end sways through the cycle. Fins and marks are the plans' own
// (shark.ts, whale.ts).
import { get, line, rect, set, swing, type Grid, type Key, type Pose } from './grid.ts';

export interface Shape {
  /** Length and greatest depth, native px. */
  readonly len: number;
  readonly high: number;
  /** Where the bulk sits: above 1 moves it forward (whales), below 1 back. */
  readonly bulk: number;
  /** How the depth swells: below 1 is blunter and boxier, 1 a plain curve. */
  readonly point: number;
  /** The share of the depth, from below, that is pale belly. */
  readonly belly: number;
  /** How far something reaches past the nose (a tusk, a hammer), px. */
  readonly nose?: number;
  /** How far the tail end sways up and down, px (default 2). */
  readonly sway?: number;
}

export interface Body {
  readonly x0: number;
  readonly x1: number;
  /** The midline at the tail end, after the sway. */
  readonly tailY: number;
  /** The column at fraction t of the length, 0 the tail, 1 the nose. */
  readonly xAt: (t: number) => number;
  /** The top and bottom rows of the body in a column. */
  readonly topAt: (x: number) => number;
  readonly bottomAt: (x: number) => number;
  readonly cy: number;
}

const CY = 12;
const CENTRE = 12;

/** `tail`: how far the tail fin reaches behind the body; the whole is centred. */
export function drawMarineBody(g: Grid, pose: Pose, shape: Shape, tail: number): Body {
  const x0 = Math.round(CENTRE - (shape.len + tail + (shape.nose ?? 0)) / 2) + tail;
  const x1 = x0 + shape.len - 1;
  const sway = swing(pose.phase) * ((shape.sway ?? 2) / 2);
  const tops = new Map<number, number>();
  const bottoms = new Map<number, number>();
  for (let x = x0; x <= x1; x++) {
    const t = (x - x0) / (x1 - x0);
    const half = Math.max(
      0.5,
      (shape.high / 2) * Math.sin(Math.PI * t ** shape.bulk) ** shape.point,
    );
    const mid = CY + sway * (1 - t) ** 3 * 2;
    const top = Math.round(mid - half);
    const bottom = Math.round(mid + half);
    rect(g, x, top, x, bottom, 'b');
    const pale = Math.round(bottom - (bottom - top) * shape.belly);
    if (pale < bottom) rect(g, x, pale + 1, x, bottom, 'h');
    tops.set(x, top);
    bottoms.set(x, bottom);
  }
  return {
    x0,
    x1,
    cy: CY,
    tailY: Math.round(CY + sway * 2),
    xAt: (t) => Math.round(x0 + t * (x1 - x0)),
    topAt: (x) => tops.get(x) ?? CY,
    bottomAt: (x) => bottoms.get(x) ?? CY,
  };
}

/** Recolours a pixel of the body, leaving the water around it empty. */
export function paint(g: Grid, x: number, y: number, k: Key): void {
  if (get(g, x, y) !== '.') set(g, x, y, k);
}

/** A fin: a fan of lines from a base (x, y) to x+dx across, out to the tip. */
export function fin(g: Grid, x: number, y: number, dx: number, tip: [number, number], k: Key) {
  for (let i = 0; i <= dx; i++) line(g, x + i, y, tip[0], tip[1], k);
}
