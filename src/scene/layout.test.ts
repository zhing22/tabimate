import { describe, expect, it } from 'vitest';
import { tile } from './layers';
import { PROP_SEGMENT, propsInSegment, segmentsInView } from './props';
import { seededRandom } from './random';

describe('tile', () => {
  it.each([0, 1, 37, 319, 320, 1234.6, -50])('covers the whole view at camera %f', (camera) => {
    for (const drawWidth of [195, 288, 320, 427, 640]) {
      const { firstX, copies } = tile(camera, 0.5, 320, drawWidth);
      expect(firstX).toBeLessThanOrEqual(0);
      expect(firstX).toBeGreaterThan(-320);
      expect(firstX + copies * 320).toBeGreaterThanOrEqual(drawWidth);
      expect(Number.isInteger(firstX)).toBe(true);
    }
  });

  it('moves at its parallax and repeats after one width', () => {
    expect(tile(100, 0.5, 320, 200).firstX).toBe(-50);
    expect(tile(740, 0.5, 320, 200).firstX).toBe(-50); // 370 mod 320
    expect(tile(500, 0, 320, 200).firstX).toBe(-0);
  });
});

describe('seededRandom', () => {
  it('repeats for a seed and differs between seeds', () => {
    const a = seededRandom('2026-11-12');
    const b = seededRandom('2026-11-12');
    const c = seededRandom('2026-11-13');
    const seqA = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(seqA);
    expect([c(), c(), c()]).not.toEqual(seqA);
    for (const n of seqA) expect(n >= 0 && n < 1).toBe(true);
  });
});

describe('props', () => {
  const rules = [
    { width: 8, minGap: 20, maxGap: 60 },
    { width: 24, minGap: 80, maxGap: 160 },
  ];

  it('places the same props for the same day, different ones on another', () => {
    expect(propsInSegment('2026-11-12|town', rules, 3)).toEqual(
      propsInSegment('2026-11-12|town', rules, 3),
    );
    expect(propsInSegment('2026-11-13|town', rules, 3)).not.toEqual(
      propsInSegment('2026-11-12|town', rules, 3),
    );
  });

  it('keeps each kind at least minGap apart, inside its segment, sorted', () => {
    const placed = propsInSegment('seed', rules, 5);
    expect(placed.length).toBeGreaterThan(0);
    for (const p of placed) {
      expect(p.x).toBeGreaterThanOrEqual(5 * PROP_SEGMENT);
      expect(p.x).toBeLessThan(6 * PROP_SEGMENT);
    }
    expect(placed.map((p) => p.x)).toEqual([...placed.map((p) => p.x)].sort((a, b) => a - b));
    rules.forEach((rule, kind) => {
      const xs = placed.filter((p) => p.kind === kind).map((p) => p.x);
      for (let i = 1; i < xs.length; i++) {
        expect(xs[i]! - xs[i - 1]!).toBeGreaterThanOrEqual(rule.width + rule.minGap - 1);
      }
    });
  });

  it('finds every segment a prop on screen could come from', () => {
    expect(segmentsInView(0, 195, 48)).toEqual({ first: -1, last: 0 });
    expect(segmentsInView(300, 320, 48)).toEqual({ first: 0, last: 2 });
  });
});
