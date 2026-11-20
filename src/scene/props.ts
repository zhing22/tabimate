import { seededRandom } from './random';

export interface PropRule {
  readonly width: number;
  /** Space between one prop of this kind and the next, native px. */
  readonly minGap: number;
  readonly maxGap: number;
}

/** A prop standing at world x (its left edge). `kind` indexes the biome's props. */
export interface PlacedProp {
  readonly kind: number;
  readonly x: number;
  /**
   * 0..1, seeded: in a border, whether this prop shows (strip.ts biomeOfProp), so
   * the two biomes' props mix the same way for everyone that day.
   */
  readonly roll: number;
}

/** Props are placed a stretch of world at a time, so only new stretches cost anything. */
export const PROP_SEGMENT = 256;

/**
 * Props in one segment of the world. Seeded by the puzzle date, biome and
 * segment, so the walk looks the same for everyone that day, on any screen
 * width and however far they scrolled before. Sorted by x.
 */
export function propsInSegment(
  seed: string,
  rules: readonly PropRule[],
  segment: number,
): readonly PlacedProp[] {
  const start = segment * PROP_SEGMENT;
  const end = start + PROP_SEGMENT;
  const placed: PlacedProp[] = [];
  // Its own stream, so the rolls never change where props stand.
  const rolls = seededRandom(`${seed}|roll|${segment}`);
  rules.forEach((rule, kind) => {
    const random = seededRandom(`${seed}|${kind}|${segment}`);
    const gap = () => rule.minGap + random() * (rule.maxGap - rule.minGap);
    // Start part way into a gap, so segments don't all begin with a prop.
    for (let x = start + random() * gap(); x < end; x += rule.width + gap()) {
      placed.push({ kind, x: Math.floor(x), roll: rolls() });
    }
  });
  return placed.sort((a, b) => a.x - b.x);
}

export interface SegmentRange {
  first: number;
  last: number;
}

/**
 * Segments that can have a prop on screen, for props up to maxWidth wide.
 * Writes into `out` (a frame passes one scratch object, so it allocates nothing).
 */
export function segmentsInView(
  cameraX: number,
  drawWidth: number,
  maxWidth: number,
  out: SegmentRange = { first: 0, last: 0 },
): SegmentRange {
  out.first = Math.floor((cameraX - maxWidth) / PROP_SEGMENT);
  out.last = Math.floor((cameraX + drawWidth) / PROP_SEGMENT);
  return out;
}

const PROP_CACHE_LIMIT = 64;
// Cache key: biome stop index x stride + segment. A walk spans a few dozen
// segments, far below the stride, so keys never collide (and no string is built).
const KEY_STRIDE = 1_000_000;

/**
 * Props per (biome, segment), placed once when a stretch first comes into view.
 * At the limit the oldest entry goes (a Map keeps insertion order), so a long
 * walk refills it a little at a time instead of all at once.
 */
export function createPropCache<Id extends string>(
  seed: string,
  rulesFor: (id: Id) => readonly PropRule[],
) {
  const cache = new Map<number, readonly PlacedProp[]>();
  return (index: number, id: Id, segment: number): readonly PlacedProp[] => {
    const key = index * KEY_STRIDE + segment;
    let list = cache.get(key);
    if (!list) {
      if (cache.size >= PROP_CACHE_LIMIT) cache.delete(cache.keys().next().value!);
      list = propsInSegment(`${seed}|${id}`, rulesFor(id), segment);
      cache.set(key, list);
    }
    return list;
  };
}
