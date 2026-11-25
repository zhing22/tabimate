import { describe, expect, it } from 'vitest';
import { PANEL, PORTRAIT } from '@/config/layout';
import { layoutMode, panelWidth, sceneArea } from './layout';

describe('layoutMode', () => {
  it.each([
    [360, 640, 'portrait'],
    [768, 1024, 'portrait'],
    [844, 390, 'landscape'],
    [1366, 768, 'landscape'],
    [800, 800, 'landscape'],
    [0, 0, 'portrait'],
  ] as const)('%ix%i is %s', (w, h, mode) => {
    expect(layoutMode(w, h)).toBe(mode);
  });
});

describe('panelWidth', () => {
  it('is 38vw between its minimum and maximum', () => {
    expect(panelWidth(844)).toBe(PANEL.minPx);
    expect(panelWidth(1366)).toBeCloseTo(519.08);
    expect(panelWidth(1920)).toBe(PANEL.maxPx);
  });
});

describe('sceneArea', () => {
  it('is the stage on top in portrait', () => {
    expect(sceneArea(390, 844)).toEqual({ width: 390, height: 844 * PORTRAIT.stageShare });
  });

  it('is the window left of the panel in landscape', () => {
    expect(sceneArea(1920, 1080)).toEqual({ width: 1320, height: 1080 });
    expect(sceneArea(844, 390)).toEqual({ width: 444, height: 390 });
  });
});
