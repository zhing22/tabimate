import {
  MAX_VISIBLE_WIDTH,
  NATIVE_HEIGHT,
  PARTY_MIN_WIDTH,
  SCENE_FIT,
  SCENE_FRAME,
} from '@/config/render';

/** A box in device pixels, from the scene area's top-left. */
export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

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
  /** Where the 180-row scene's top-left sits (device px): sky above it, ground below. */
  readonly offsetX: number;
  readonly offsetY: number;
  /** The part of the area the scene fills (all of it, unless framed). */
  readonly stage: Box;
  /** The area is wider than MAX_VISIBLE_WIDTH at this scale: the stage sits in a frame. */
  readonly framed: boolean;
}

/** The largest whole scale at which 180 rows fit and the party is in view (at least x1). */
function fitScale(width: number, height: number): number {
  const byHeight = Math.floor(height / NATIVE_HEIGHT);
  const byWidth = Math.floor(width / PARTY_MIN_WIDTH);
  return Math.max(1, Math.min(byHeight, byWidth));
}

/** The stage at a scale: the area itself, or a framed box inside it when the area is too wide. */
function stageFor(
  w: number,
  h: number,
  dpr: number,
): { stage: Box; scale: number; framed: boolean } {
  const scale = fitScale(w, h);
  if (Math.floor(w / scale) <= MAX_VISIBLE_WIDTH) {
    return { stage: { x: 0, y: 0, width: w, height: h }, scale, framed: false };
  }
  const inset = Math.round((SCENE_FRAME.borderPx + SCENE_FRAME.gapPx) * dpr);
  const innerH = Math.max(1, h - 2 * inset);
  const framedScale = fitScale(w - 2 * inset, innerH);
  const width = Math.min(w - 2 * inset, MAX_VISIBLE_WIDTH * framedScale);
  const x = Math.round((w - width) / 2);
  return { stage: { x, y: inset, width, height: innerH }, scale: framedScale, framed: true };
}

/**
 * Fits the scene to its area (CSS px at a device pixel ratio). The scale is
 * the largest whole number at which NATIVE_HEIGHT fits the height and the
 * world in view is at least PARTY_MIN_WIDTH wide; leftover rows become sky
 * above and ground below. Pixels are never stretched. An area wider than
 * MAX_VISIBLE_WIDTH at that scale gets a framed stage instead of a wider world.
 */
export function computeViewport(cssW: number, cssH: number, dpr: number): Viewport {
  const canvasW = Math.round(cssW * dpr);
  const canvasH = Math.round(cssH * dpr);
  const { stage, scale, framed } = stageFor(canvasW, canvasH, dpr);
  const visibleWidth = Math.min(MAX_VISIBLE_WIDTH, Math.floor(stage.width / scale));
  const spare = Math.max(0, stage.height - NATIVE_HEIGHT * scale);
  return {
    scale,
    canvasW,
    canvasH,
    visibleWidth,
    drawWidth: Math.min(MAX_VISIBLE_WIDTH, Math.ceil(stage.width / scale)),
    offsetX: stage.x,
    offsetY: stage.y + Math.round(spare * SCENE_FIT.skyShare),
    stage,
    framed,
  };
}
