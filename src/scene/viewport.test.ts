import { describe, expect, it } from 'vitest';
import { MAX_VISIBLE_WIDTH, NATIVE_HEIGHT, PARTY_MIN_WIDTH } from '@/config/render';
import { sceneArea } from '@/core/layout';
import { computeViewport } from './viewport';

/** The viewport for a whole window: its scene area (stage or left of the panel). */
const forWindow = (w: number, h: number, dpr: number) => {
  const area = sceneArea(w, h);
  return computeViewport(area.width, area.height, dpr);
};

describe('computeViewport for real windows', () => {
  // [window, dpr, scale, visible native px, scene top (device px)]
  it.each([
    ['360x640 phone, stage on top', 360, 640, 2, 2, 360, 56],
    ['390x844 phone, stage on top', 390, 844, 3, 4, 292, 106],
    ['844x390 phone on its side, panel right', 844, 390, 3, 6, 222, 68],
    ['1366x768 laptop, panel right', 1366, 768, 1, 3, 282, 171],
    ['1920x1080 desktop, panel right', 1920, 1080, 1, 6, 220, 0],
    ['2560x1080 ultrawide, panel right', 2560, 1080, 1, 6, 326, 0],
  ])('%s', (_name, w, h, dpr, scale, visible, offsetY) => {
    const v = forWindow(w, h, dpr);
    expect(v).toMatchObject({ scale, visibleWidth: visible, offsetY, framed: false });
    expect(v.visibleWidth).toBeGreaterThanOrEqual(PARTY_MIN_WIDTH);
    expect(NATIVE_HEIGHT * v.scale).toBeLessThanOrEqual(v.canvasH);
  });
});

describe('computeViewport', () => {
  it('takes the largest scale that fits the height and keeps the whole party in view', () => {
    // 900 rows allow x5, but x5 shows only 1000 / 5 = 200 px: x4 keeps 250.
    expect(computeViewport(1000, 900, 1)).toMatchObject({ scale: 4, visibleWidth: 250 });
  });

  it('splits leftover rows: most become sky above, the rest ground below', () => {
    const v = computeViewport(500, 400, 1); // x2 = 360 rows, 40 spare
    expect(v.offsetY).toBe(30);
    expect(v.stage).toEqual({ x: 0, y: 0, width: 500, height: 400 });
  });

  it('frames the stage instead of showing more than MAX_VISIBLE_WIDTH of world', () => {
    const v = computeViewport(3000, 420, 1);
    // 12 px border + 16 px gap each side; 364 rows inside allow x2.
    expect(v).toMatchObject({ framed: true, scale: 2, visibleWidth: MAX_VISIBLE_WIDTH });
    expect(v.stage).toEqual({ x: 860, y: 28, width: 1280, height: 364 });
    expect(v.offsetX).toBe(860);
    expect(v.offsetY).toBe(28 + 3); // 4 spare rows, 3 above
  });

  it('draws the partly visible column at the edge too', () => {
    const odd = computeViewport(441, 180, 1); // x1: 441 columns, all whole
    expect(odd).toMatchObject({ visibleWidth: 441, drawWidth: 441 });
    const part = computeViewport(441, 360, 1.5); // 661.5 -> 662 / x3 = 220.67
    expect(part).toMatchObject({ scale: 3, visibleWidth: 220, drawWidth: 221 });
  });

  it('never goes below x1', () => {
    expect(computeViewport(100, 100, 1).scale).toBe(1);
  });

  it('handles fractional device pixel ratios', () => {
    const v = computeViewport(412, 311, 2.625); // 1081.5 x 816.4 device px
    expect(v).toMatchObject({ canvasW: 1082, canvasH: 816, scale: 4, visibleWidth: 270 });
  });
});
