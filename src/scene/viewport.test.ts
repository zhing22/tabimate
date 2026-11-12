import { describe, expect, it } from 'vitest';
import { MAX_VISIBLE_WIDTH } from '@/config/render';
import { computeViewport } from './viewport';

describe('computeViewport', () => {
  // The Art specs table (scene area in device px). The ultrawide row says 427,
  // which is 2560 / 6 rounded; the rule floors it, so 426 whole pixels fit.
  it.each([
    ['phone portrait', 390, 360, 3, 6, 195],
    ['laptop window', 1440, 900, 1, 5, 288],
    ['desktop 1080p', 1920, 1080, 1, 6, 320],
    ['ultrawide', 2560, 1080, 1, 6, 426],
  ])('%s: %ix%i css at dpr %i -> x%i, %i px wide', (_name, w, h, dpr, scale, visible) => {
    const v = computeViewport(w, h, dpr);
    expect(v.scale).toBe(scale);
    expect(v.visibleWidth).toBe(visible);
    expect(v.canvasW).toBe(w * dpr);
    expect(v.canvasH).toBe(h * dpr);
  });

  it('puts leftover device rows above the scene, never stretching it', () => {
    const v = computeViewport(1440, 900, 1); // x5 = 900 rows exactly
    expect(v.offsetY).toBe(0);
    const tall = computeViewport(390, 380, 3); // 1140 rows: x6 = 1080, 60 left over
    expect(tall).toMatchObject({ scale: 6, offsetY: 60 });
  });

  it('draws the partly visible column at the edge too', () => {
    const v = computeViewport(1000, 180, 1);
    expect(v).toMatchObject({ visibleWidth: 640, drawWidth: 640 }); // capped
    const odd = computeViewport(392, 360, 3); // 1176 / 6 = 196
    expect(odd).toMatchObject({ visibleWidth: 196, drawWidth: 196 });
    const part = computeViewport(393, 360, 3); // 1179 / 6 = 196.5
    expect(part).toMatchObject({ visibleWidth: 196, drawWidth: 197 });
  });

  it('never goes below x1, and caps the width it draws', () => {
    expect(computeViewport(300, 100, 1).scale).toBe(1);
    expect(computeViewport(4000, 200, 1).visibleWidth).toBe(MAX_VISIBLE_WIDTH);
  });

  it('handles fractional device pixel ratios', () => {
    const v = computeViewport(412, 400, 2.625); // 1081.5 x 1050 device px
    expect(v).toMatchObject({ canvasW: 1082, canvasH: 1050, scale: 5, visibleWidth: 216 });
  });
});
