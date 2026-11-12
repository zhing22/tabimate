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
  rules.forEach((rule, kind) => {
    const random = seededRandom(`${seed}|${kind}|${segment}`);
    const gap = () => rule.minGap + random() * (rule.maxGap - rule.minGap);
    // Start part way into a gap, so segments don't all begin with a prop.
    for (let x = start + random() * gap(); x < end; x += rule.width + gap()) {
      placed.push({ kind, x: Math.floor(x) });
    }
  });
  return placed.sort((a, b) => a.x - b.x);
}

/** Segments that can have a prop on screen, for props up to maxWidth wide. */
export function segmentsInView(
  cameraX: number,
  drawWidth: number,
  maxWidth: number,
): { readonly first: number; readonly last: number } {
  return {
    first: Math.floor((cameraX - maxWidth) / PROP_SEGMENT),
    last: Math.floor((cameraX + drawWidth) / PROP_SEGMENT),
  };
}
