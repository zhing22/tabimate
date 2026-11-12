import { MAX_VISIBLE_WIDTH, NATIVE_HEIGHT } from '@/config/render';

export interface Viewport {
  /** Device pixels per native pixel: always a whole number. */
  readonly scale: number;
  /** The scene area in device pixels. */
  readonly canvasW: number;
  readonly canvasH: number;
  /** Whole native pixels of world that fit across. */
  readonly visibleWidth: number;
  /** Native columns to draw: visibleWidth plus the partly visible one at the edge. */
  readonly drawWidth: number;
  /**
   * Device rows left over above the scene (the scene sits on the bottom edge,
   * so the ground meets the UI below). Filled with the sky colour.
   */
  readonly offsetY: number;
}

/**
 * The Art specs scaling rule: scale = floor(sceneHeight × dpr / 180), and the
 * world is as wide as fits at that scale. Pixels are never stretched.
 */
export function computeViewport(cssW: number, cssH: number, dpr: number): Viewport {
  const canvasW = Math.round(cssW * dpr);
  const canvasH = Math.round(cssH * dpr);
  const scale = Math.max(1, Math.floor(canvasH / NATIVE_HEIGHT));
  const visibleWidth = Math.min(MAX_VISIBLE_WIDTH, Math.floor(canvasW / scale));
  const drawWidth = Math.min(MAX_VISIBLE_WIDTH, Math.ceil(canvasW / scale));
  return {
    scale,
    canvasW,
    canvasH,
    visibleWidth,
    drawWidth,
    offsetY: canvasH - NATIVE_HEIGHT * scale,
  };
}
