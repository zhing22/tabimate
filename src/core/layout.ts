// Layout rules shared by the UI shell and the scene: which way the window is
// laid out, and how big the scene area is. Pure, so the scene's fit can be
// tested for real window sizes.
import { LANDSCAPE_FROM_ASPECT, PANEL, PORTRAIT } from '@/config/layout';

export type LayoutMode = 'portrait' | 'landscape';

/** From the window's shape, not its width: a tablet upright is portrait, a phone on its side landscape. */
export function layoutMode(width: number, height: number): LayoutMode {
  return height > 0 && width / height >= LANDSCAPE_FROM_ASPECT ? 'landscape' : 'portrait';
}

/** The landscape panel's width in CSS px (PANEL_WIDTH_CSS, worked out). */
export function panelWidth(windowWidth: number): number {
  const preferred = (windowWidth * PANEL.vw) / 100;
  return Math.min(PANEL.maxPx, Math.max(PANEL.minPx, preferred));
}

export interface Area {
  readonly width: number;
  readonly height: number;
}

/**
 * The scene's area in CSS px: the stage above the sheet in portrait, the
 * window left of the panel in landscape.
 */
export function sceneArea(windowWidth: number, windowHeight: number): Area {
  if (layoutMode(windowWidth, windowHeight) === 'portrait') {
    return { width: windowWidth, height: windowHeight * PORTRAIT.stageShare };
  }
  return { width: Math.max(0, windowWidth - panelWidth(windowWidth)), height: windowHeight };
}
